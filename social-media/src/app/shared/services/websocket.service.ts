/**
 * WebSocket Service
 *
 * Provides WebSocket communication with automatic reconnection,
 * message queuing, and fallback to HTTP polling.
 *
 * Features:
 * - Connect/disconnect with JWT authentication
 * - Subscribe/unsubscribe to channels
 * - Send messages with acknowledgment
 * - RxJS-based event streams
 * - Automatic reconnection with exponential backoff
 * - Connection status observable
 * - Message queue while disconnected
 * - Fallback to HTTP polling when WebSocket unavailable
 */
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, ReplaySubject, of, timer } from 'rxjs';
import { filter, switchMap, takeUntil, tap, catchError, retryWhen, delayWhen } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * WebSocket message structure
 */
export interface WSMessage<T = any> {
  id: string;
  type: string;
  payload: T;
  channel?: string;
  ack_id?: string;
  timestamp: string;
}

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}

/**
 * Poll response structure for HTTP fallback
 */
export interface PollResponse<T = any> {
  events: WSMessage<T>[];
  last_poll_id: number;
  has_more: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  /** WebSocket server URL */
  private readonly wsUrl = environment.wsUrl || 'ws://localhost:8082/ws';
  
  /** HTTP polling URL */
  private readonly pollUrl = environment.apiUrl + '/api/v1/realtime/poll';

  /** Current WebSocket connection */
  private ws: WebSocket | null = null;

  /** Connection status subject */
  private statusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

  /** Message subject for broadcasting */
  private messageSubject = new Subject<WSMessage>();

  /** Destroy subject for cleanup */
  private destroySubject = new Subject<void>();

  /** Message queue for disconnected state */
  private messageQueue: WSMessage[] = [];

  /** Subscription map for channels */
  private channelSubscriptions = new Map<string, Subject<WSMessage>>();

  /** Reconnection attempt counter */
  private reconnectAttempts = 0;

  /** Maximum reconnection attempts */
  private maxReconnectAttempts = 10;

  /** Reconnection delay in milliseconds */
  private reconnectDelay = 1000;

  /** Maximum reconnection delay */
  private maxReconnectDelay = 30000;

  /** Whether to use HTTP polling fallback */
  private usePolling = false;

  /** Last poll ID for HTTP polling */
  private lastPollId = 0;

  /** Polling interval in milliseconds */
  private pollingInterval = 5000;

  /** Polling subscription */
  private pollingSubscription: any = null;

  /** Current user ID */
  private userId: string | null = null;

  /** Current JWT token */
  private token: string | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Get connection status observable
   */
  get status$(): Observable<ConnectionStatus> {
    return this.statusSubject.asObservable();
  }

  /**
   * Get connected status
   */
  get isConnected(): boolean {
    return this.statusSubject.value === ConnectionStatus.CONNECTED;
  }

  /**
   * Connect to WebSocket server
   * @param token - JWT authentication token
   * @param userId - User ID
   */
  connect(token: string, userId: string): void {
    if (this.isConnected) {
      return;
    }

    this.token = token;
    this.userId = userId;
    this.setStatus(ConnectionStatus.CONNECTING);

    try {
      const url = `${this.wsUrl}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus(ConnectionStatus.CONNECTED);
        this.reconnectAttempts = 0;
        this.flushMessageQueue();
        this.startPolling();
      };

      this.ws.onclose = () => {
        this.setStatus(ConnectionStatus.DISCONNECTED);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.setStatus(ConnectionStatus.DISCONNECTED);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.fallbackToPolling();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.destroySubject.next();
    this.destroySubject.complete();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }

    this.setStatus(ConnectionStatus.DISCONNECTED);
    this.channelSubscriptions.clear();
    this.messageQueue = [];
    this.userId = null;
    this.token = null;
  }

  /**
   * Subscribe to a channel
   * @param channel - Channel name
   */
  subscribe(channel: string): Observable<WSMessage> {
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Subject<WSMessage>());
      
      if (this.isConnected) {
        this.send({
          type: 'subscribe',
          payload: { channel }
        });
      }
    }

    return this.channelSubscriptions.get(channel)!.asObservable();
  }

  /**
   * Unsubscribe from a channel
   * @param channel - Channel name
   */
  unsubscribe(channel: string): void {
    if (this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.get(channel)!.complete();
      this.channelSubscriptions.delete(channel);

      if (this.isConnected) {
        this.send({
          type: 'unsubscribe',
          payload: { channel }
        });
      }
    }
  }

  /**
   * Send a message
   * @param message - Message to send
   */
  send<T>(message: Omit<WSMessage<T>, 'id' | 'timestamp'>): void {
    const fullMessage: WSMessage<T> = {
      ...message,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };

    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      this.messageQueue.push(fullMessage);
    }
  }

  /**
   * Send a message and wait for acknowledgment
   * @param message - Message to send
   * @param timeout - Timeout in milliseconds
   */
  sendWithAck<T, R>(message: Omit<WSMessage<T>, 'id' | 'timestamp'>, timeout: number = 5000): Observable<R> {
    const ackId = this.generateId();
    const ackSubject = new ReplaySubject<R>(1);

    const ackSubscription = this.on('ack')
      .pipe(
        filter((msg: WSMessage) => msg.ack_id === ackId),
        takeUntil(this.destroySubject)
      )
      .subscribe({
        next: (msg) => {
          ackSubject.next(msg.payload as R);
          ackSubject.complete();
        },
        error: (error) => ackSubject.error(error)
      });

    // Set timeout
    timer(timeout)
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        ackSubject.error(new Error('Acknowledgment timeout'));
      });

    this.send({
      ...message,
      ack_id: ackId
    });

    return ackSubject.asObservable();
  }

  /**
   * Listen to all messages of a specific type
   * @param type - Message type
   */
  on<T>(type: string): Observable<WSMessage<T>> {
    return this.messageSubject.asObservable().pipe(
      filter(msg => msg.type === type)
    );
  }

  /**
   * Get missed messages via HTTP polling
   * @param lastSequence - Last known message sequence
   */
  getMissedMessages(lastSequence: number): Observable<WSMessage[]> {
    const params = new HttpParams()
      .set('user_id', this.userId || '')
      .set('last_sequence', lastSequence.toString());

    return this.http.get<{ messages: WSMessage[] }>(this.pollUrl + '/missed', { params });
  }

  /**
   * Set connection status
   */
  private setStatus(status: ConnectionStatus): void {
    this.statusSubject.next(status);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WSMessage): void {
    this.messageSubject.next(message);

    // Route to channel subscribers
    if (message.channel && this.channelSubscriptions.has(message.channel)) {
      this.channelSubscriptions.get(message.channel)!.next(message);
    }
  }

  /**
   * Flush message queue after reconnection
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws) {
      const message = this.messageQueue.shift()!;
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, falling back to polling');
      this.fallbackToPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    this.setStatus(ConnectionStatus.RECONNECTING);

    timer(delay)
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        if (this.token && this.userId) {
          this.connect(this.token, this.userId);
        }
      });
  }

  /**
   * Fallback to HTTP polling when WebSocket is unavailable
   */
  private fallbackToPolling(): void {
    this.usePolling = true;
    this.startPolling();
  }

  /**
   * Start HTTP polling
   */
  private startPolling(): void {
    if (this.pollingSubscription || !this.userId) {
      return;
    }

    this.pollingSubscription = timer(0, this.pollingInterval)
      .pipe(
        switchMap(() => this.poll()),
        retryWhen(errors =>
          errors.pipe(
            delayWhen(() => timer(this.pollingInterval)),
            takeUntil(this.destroySubject)
          )
        ),
        takeUntil(this.destroySubject)
      )
      .subscribe({
        next: (response) => {
          response.events.forEach(event => this.handleMessage(event));
          this.lastPollId = response.last_poll_id;
        },
        error: (error) => console.error('Polling error:', error)
      });
  }

  /**
   * Poll for new events
   */
  private poll(): Observable<PollResponse> {
    const params = new HttpParams()
      .set('user_id', this.userId || '')
      .set('last_poll_id', this.lastPollId.toString())
      .set('timeout', '30');

    return this.http.get<PollResponse>(this.pollUrl, { params }).pipe(
      catchError(() => of({ events: [], last_poll_id: this.lastPollId, has_more: false }))
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
