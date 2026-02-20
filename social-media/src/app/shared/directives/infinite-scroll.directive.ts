import { 
  Directive, 
  ElementRef, 
  EventEmitter, 
  OnDestroy, 
  OnInit, 
  Output,
  Renderer2 
} from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true
})
export class InfiniteScrollDirective implements OnInit, OnDestroy {
  @Output() scrolled = new EventEmitter<void>();
  
  private scrollListener: (() => void) | null = null;
  private isThrottled = false;
  private threshold = 100; // pixels from bottom

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const element = this.elementRef.nativeElement;
    
    this.scrollListener = this.renderer.listen(
      element,
      'scroll',
      () => this.onScroll()
    );
  }

  private onScroll(): void {
    if (this.isThrottled) {
      return;
    }

    const element = this.elementRef.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const remaining = scrollHeight - (scrollTop + clientHeight);

    if (remaining <= this.threshold) {
      this.isThrottled = true;
      this.scrolled.emit();
      
      // Reset throttle after 500ms
      setTimeout(() => {
        this.isThrottled = false;
      }, 500);
    }
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      this.scrollListener();
    }
  }
}
