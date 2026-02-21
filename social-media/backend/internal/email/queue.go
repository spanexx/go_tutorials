// Package email provides email sending functionality using SMTP.
// Code Map: queue.go
// - EmailTask: Queued email task structure
// - EmailQueue: Redis-based email queue
// - NewEmailQueue: Constructor
// - QueueEmail: Add email to queue
// - StartWorker: Background worker goroutine
// - Stop: Graceful shutdown
// - processEmail: Process single email with retry logic
// CID: [6/6] Async Email Queue - 1.6.6
package email

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// EmailTask represents a queued email task
type EmailTask struct {
	To          []string `json:"to"`
	From        string   `json:"from"`
	Subject     string   `json:"subject"`
	HTMLBody    string   `json:"html_body"`
	TextBody    string   `json:"text_body"`
	Attachments []string `json:"attachments,omitempty"`
	RetryCount  int      `json:"retry_count"`
	MaxRetries  int      `json:"max_retries"`
	CreatedAt   time.Time `json:"created_at"`
}

// EmailQueue handles async email processing using Redis
type EmailQueue struct {
	redis      *redis.Client
	queueKey   string
	dlqKey     string // Dead letter queue
	workerCtx  context.Context
	workerCancel context.CancelFunc
	wg         sync.WaitGroup
	running    bool
	mu         sync.RWMutex
}

// NewEmailQueue creates a new email queue
func NewEmailQueue(redisClient *redis.Client, queueKey, dlqKey string) *EmailQueue {
	ctx, cancel := context.WithCancel(context.Background())
	return &EmailQueue{
		redis:      redisClient,
		queueKey:   queueKey,
		dlqKey:     dlqKey,
		workerCtx:  ctx,
		workerCancel: cancel,
	}
}

// QueueEmail adds an email to the queue
func (q *EmailQueue) QueueEmail(ctx context.Context, task *EmailTask) error {
	if q.redis == nil {
		return fmt.Errorf("redis client not configured")
	}

	task.CreatedAt = time.Now()
	task.MaxRetries = 3

	data, err := json.Marshal(task)
	if err != nil {
		return fmt.Errorf("failed to marshal email task: %w", err)
	}

	// Push to Redis list (LPUSH for queue behavior)
	return q.redis.LPush(ctx, q.queueKey, data).Err()
}

// StartWorker starts the background worker goroutine
func (q *EmailQueue) StartWorker(emailService *EmailService) {
	q.mu.Lock()
	if q.running {
		q.mu.Unlock()
		return
	}
	q.running = true
	q.mu.Unlock()

	q.wg.Add(1)
	go func() {
		defer q.wg.Done()
		log.Printf("Email queue worker started (queue: %s, dlq: %s)", q.queueKey, q.dlqKey)

		for {
			select {
			case <-q.workerCtx.Done():
				log.Println("Email queue worker shutting down...")
				return
			default:
				q.processNextEmail(emailService)
			}
		}
	}()
}

// Stop gracefully stops the worker
func (q *EmailQueue) Stop() {
	log.Println("Stopping email queue worker...")
	q.workerCancel()
	q.wg.Wait()
	log.Println("Email queue worker stopped")
}

// processNextEmail processes the next email in the queue
func (q *EmailQueue) processNextEmail(emailService *EmailService) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// BRPOP with 5-second timeout
	result, err := q.redis.BRPop(ctx, 5*time.Second, q.queueKey).Result()
	if err != nil {
		if err == redis.Nil {
			return // No emails in queue
		}
		log.Printf("Error reading from email queue: %v", err)
		return
	}

	if len(result) < 2 {
		return
	}

	taskData := result[1]
	var task EmailTask
	if err := json.Unmarshal([]byte(taskData), &task); err != nil {
		log.Printf("Failed to unmarshal email task: %v", err)
		return
	}

	q.processEmail(emailService, &task)
}

// processEmail processes a single email with retry logic
func (q *EmailQueue) processEmail(emailService *EmailService, task *EmailTask) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	msg := &EmailMessage{
		To:          task.To,
		From:        task.From,
		Subject:     task.Subject,
		HTMLBody:    task.HTMLBody,
		TextBody:    task.TextBody,
		Attachments: task.Attachments,
	}

	err := emailService.SendEmail(ctx, msg)
	if err == nil {
		log.Printf("Email sent successfully to %v", task.To)
		return
	}

	// Retry logic with exponential backoff
	task.RetryCount++
	log.Printf("Email send failed (attempt %d/%d): %v", task.RetryCount, task.MaxRetries, err)

	if task.RetryCount >= task.MaxRetries {
		// Move to dead letter queue
		q.moveToDeadLetterQueue(ctx, task, err)
		return
	}

	// Calculate backoff delay: 1s, 2s, 4s, 8s...
	delay := time.Duration(math.Pow(2, float64(task.RetryCount-1))) * time.Second
	log.Printf("Retrying email in %v", delay)

	// Re-queue with delay
	time.Sleep(delay)
	q.QueueEmail(ctx, task)
}

// moveToDeadLetterQueue moves failed email to DLQ
func (q *EmailQueue) moveToDeadLetterQueue(ctx context.Context, task *EmailTask, lastErr error) {
	dlqTask := map[string]interface{}{
		"task":       task,
		"error":      lastErr.Error(),
		"failed_at":  time.Now(),
		"retry_count": task.RetryCount,
	}

	data, err := json.Marshal(dlqTask)
	if err != nil {
		log.Printf("Failed to marshal DLQ task: %v", err)
		return
	}

	if err := q.redis.LPush(ctx, q.dlqKey, data).Err(); err != nil {
		log.Printf("Failed to add to dead letter queue: %v", err)
	}

	log.Printf("Email moved to dead letter queue after %d attempts", task.RetryCount)
}

// GetQueueLength returns the current queue length
func (q *EmailQueue) GetQueueLength(ctx context.Context) (int64, error) {
	if q.redis == nil {
		return 0, nil
	}
	return q.redis.LLen(ctx, q.queueKey).Result()
}

// GetDLQLength returns the dead letter queue length
func (q *EmailQueue) GetDLQLength(ctx context.Context) (int64, error) {
	if q.redis == nil {
		return 0, nil
	}
	return q.redis.LLen(ctx, q.dlqKey).Result()
}
