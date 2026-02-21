import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ComponentRef,
  ViewContainerRef,
  ComponentFactoryResolver
} from '@angular/core';
import { UserProfileCardComponent } from '../user-profile-card/user-profile-card.component';

@Directive({
  selector: '[appUserProfile]',
  standalone: true
})
export class UserProfileDirective implements OnInit, OnDestroy {
  @Input('appUserProfile') username: string = '';
  @Input() profilePosition: 'top' | 'bottom' = 'bottom';

  private profileCardRef: ComponentRef<UserProfileCardComponent> | null = null;
  private showTimeout: any;
  private hideTimeout: any;
  private isHovering = false;
  private cleanupListeners: (() => void)[] = [];

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private viewContainerRef: ViewContainerRef,
    private componentFactoryResolver: ComponentFactoryResolver
  ) { }

  ngOnInit(): void {
    this.addEventListeners();
    this.styleElement();
  }

  private styleElement(): void {
    this.renderer.setStyle(this.elementRef.nativeElement, 'cursor', 'pointer');
    this.renderer.setStyle(this.elementRef.nativeElement, 'text-decoration', 'none');
    this.renderer.setStyle(this.elementRef.nativeElement, 'position', 'relative');
  }

  private addEventListeners(): void {
    const element = this.elementRef.nativeElement;

    const mouseEnter = this.renderer.listen(element, 'mouseenter', () => {
      this.isHovering = true;
      this.showTimeout = setTimeout(() => {
        if (this.isHovering) {
          this.showProfileCard();
        }
      }, 300);
    });

    const mouseLeave = this.renderer.listen(element, 'mouseleave', () => {
      this.isHovering = false;
      clearTimeout(this.showTimeout);
      this.hideTimeout = setTimeout(() => {
        this.hideProfileCard();
      }, 200);
    });

    this.cleanupListeners.push(mouseEnter, mouseLeave);
  }

  private showProfileCard(): void {
    if (this.profileCardRef) {
      return;
    }

    const factory = this.componentFactoryResolver.resolveComponentFactory(UserProfileCardComponent);
    this.profileCardRef = this.viewContainerRef.createComponent(factory);
    this.profileCardRef.instance.username = this.username;
    this.profileCardRef.instance.position = this.profilePosition;

    const cardElement = this.profileCardRef.location.nativeElement as HTMLElement;
    this.renderer.setStyle(cardElement, 'position', 'absolute');
    this.renderer.setStyle(cardElement, 'top', '100%');
    this.renderer.setStyle(cardElement, 'left', '50%');
    this.renderer.setStyle(cardElement, 'transform', 'translateX(-50%)');
    this.renderer.setStyle(cardElement, 'margin-top', '8px');

    // Add hover listeners to the card itself
    const cardMouseEnter = this.renderer.listen(cardElement, 'mouseenter', () => {
      this.isHovering = true;
      clearTimeout(this.hideTimeout);
    });

    const cardMouseLeave = this.renderer.listen(cardElement, 'mouseleave', () => {
      this.isHovering = false;
      this.hideTimeout = setTimeout(() => {
        this.hideProfileCard();
      }, 200);
    });

    this.cleanupListeners.push(cardMouseEnter, cardMouseLeave);
  }

  private hideProfileCard(): void {
    if (!this.isHovering && this.profileCardRef) {
      this.profileCardRef.destroy();
      this.profileCardRef = null;
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
    this.cleanupListeners.forEach(cleanup => cleanup());

    if (this.profileCardRef) {
      this.profileCardRef.destroy();
      this.profileCardRef = null;
    }
  }
}
