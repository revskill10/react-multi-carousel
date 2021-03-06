import * as React from "react";

import {
  throttle,
  getWidthFromDeviceType,
  getParitialVisibilityGutter,
  getClones,
  whenEnteredClones,
  getInitialState
} from "./utils";
import { CarouselInternalState, CarouselProps } from "./types";
import Dots from "./Dots";
import { LeftArrow, RightArrow } from "./Arrows";
import CarouselItems from "./CarouselItems";

const defaultTransitionDuration = 400;
const defaultTransition = "transform 400ms ease-in-out";
class Carousel extends React.Component<CarouselProps, CarouselInternalState> {
  public static defaultProps: any = {
    slidesToSlide: 1,
    infinite: false,
    draggable: true,
    swipeable: true,
    arrows: true,
    containerClass: "",
    sliderClass: "",
    itemClass: "",
    keyBoardControl: true,
    autoPlaySpeed: 3000,
    showDots: false,
    minimumTouchDrag: 80,
    dotListClass: ""
  };
  private readonly containerRef: React.RefObject<any>;
  public onMove: boolean;
  public initialPosition: number;
  public lastPosition: number;
  public isAnimationAllowed: boolean;
  public direction: string;
  public autoPlay?: any;
  public isInThrottle?: boolean;
  constructor(props: CarouselProps) {
    super(props);
    this.containerRef = React.createRef();
    this.state = {
      itemWidth: 0,
      slidesToShow: 0,
      currentSlide: 0,
      clones: React.Children.toArray(props.children),
      totalItems: React.Children.count(props.children),
      deviceType: "",
      domLoaded: false,
      transform: 0,
      containerWidth: 0,
      isSliding: false
    };
    const { infinite, transitionDuration } = props;
    this.onResize = this.onResize.bind(this);
    this.handleDown = this.handleDown.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleOut = this.handleOut.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.handleEnter = this.handleEnter.bind(this);
    this.setIsInThrottle = this.setIsInThrottle.bind(this);
    /*
    The reason of using throttle its because of cloning elemnts for inifinite mode.
    */
    this.next = infinite
      ? throttle(
          this.next.bind(this),
          props.transitionDuration || defaultTransitionDuration,
          this.setIsInThrottle
        )
      : this.next.bind(this);
    this.previous = infinite
      ? throttle(
          this.previous.bind(this),
          props.transitionDuration || defaultTransitionDuration,
          this.setIsInThrottle
        )
      : this.previous.bind(this);
    this.goToSlide = infinite
      ? throttle(
          this.goToSlide.bind(this),
          props.transitionDuration || defaultTransitionDuration
        )
      : this.goToSlide.bind(this);
    this.onMove = false;
    this.initialPosition = 0;
    this.lastPosition = 0;
    this.isAnimationAllowed = false;
    this.direction = "";
    this.isInThrottle = false;
  }
  public setIsInThrottle(isInThrottle: boolean = false): void {
    this.isInThrottle = isInThrottle;
  }
  public componentDidMount(): void {
    this.setState({ domLoaded: true });
    this.setItemsToShow();
    window.addEventListener("resize", this.onResize);
    this.onResize(true);
    if (this.props.keyBoardControl) {
      window.addEventListener("keyup", this.onKeyUp);
    }
    if (this.props.autoPlay && this.props.autoPlaySpeed) {
      this.autoPlay = setInterval(this.next, this.props.autoPlaySpeed);
    }
  }

  /*
  We only want to set the clones on the client-side cause it relies on getting the width of the carousel items.
  */
  public setClones(
    slidesToShow: number,
    itemWidth?: number,
    forResizing?: boolean
  ): void {
    this.isAnimationAllowed = false;
    const childrenArr = React.Children.toArray(this.props.children);
    const { clones, initialSlide } = getClones(
      this.state.slidesToShow,
      childrenArr
    );
    this.setState(
      {
        clones,
        totalItems: clones.length,
        currentSlide: forResizing ? this.state.currentSlide : initialSlide
      },
      () => {
        this.correctItemsPosition(itemWidth || this.state.itemWidth);
      }
    );
  }
  public setItemsToShow(shouldCorrectItemPosition?: boolean): void {
    const { responsive, infinite } = this.props;
    Object.keys(responsive).forEach(item => {
      const { breakpoint, items } = responsive[item];
      const { max, min } = breakpoint;
      if (window.innerWidth >= min && window.innerWidth <= max) {
        this.setState({ slidesToShow: items, deviceType: item });
        this.setContainerAndItemWidth(items, shouldCorrectItemPosition);
      }
    });
  }
  // this is for resizing.
  public setContainerAndItemWidth(
    slidesToShow: number,
    shouldCorrectItemPosition?: boolean
  ): void {
    if (this.containerRef && this.containerRef.current) {
      const containerWidth = this.containerRef.current.offsetWidth;
      const itemWidth: number = Math.round(
        this.containerRef.current.offsetWidth / slidesToShow
      );
      this.setState(
        {
          containerWidth,
          itemWidth
        },
        () => {
          if (this.props.infinite) {
            this.setClones(slidesToShow, itemWidth, shouldCorrectItemPosition);
          }
        }
      );
      if (shouldCorrectItemPosition) {
        this.correctItemsPosition(itemWidth);
      }
    }
  }
  public correctItemsPosition(
    itemWidth: number,
    isAnimationAllowed?: boolean
  ): void {
    /*
    For swipe, drag and resizing, they changed the position of the carousel, but the position are not always correct.
    Hence, this is to make sure our items are in the correct place.
    */
    if (isAnimationAllowed) {
      this.isAnimationAllowed = true;
    }
    if (!isAnimationAllowed && this.isAnimationAllowed) {
      this.isAnimationAllowed = false;
    }
    this.setState({
      transform: -(itemWidth * this.state.currentSlide)
    });
  }
  public onResize(value?: any): void {
    // value here can be html event or a boolean.
    // if its in infinite mode, we want to keep the current slide index no matter what.
    // if its not infinite mode, keeping the current slide index has already been taken care of
    const { infinite } = this.props;
    let shouldCorrectItemPosition;
    if (!infinite) {
      shouldCorrectItemPosition = false;
    } else {
      if (typeof value === "boolean" && value) {
        shouldCorrectItemPosition = false;
      } else {
        shouldCorrectItemPosition = true;
      }
    }
    this.setItemsToShow(shouldCorrectItemPosition);
  }
  public componentDidUpdate(
    { keyBoardControl, autoPlay }: CarouselProps,
    { containerWidth, domLoaded, isSliding }: CarouselInternalState
  ): void {
    if (
      this.containerRef &&
      this.containerRef.current &&
      this.containerRef.current.offsetWidth !== containerWidth
    ) {
      // this is for handing resizing.
      setTimeout(() => {
        this.setItemsToShow(true);
      }, this.props.transitionDuration || defaultTransitionDuration);
    }
    if (keyBoardControl && !this.props.keyBoardControl) {
      window.removeEventListener("keyup", this.onKeyUp);
    }
    if (autoPlay && !this.props.autoPlay && this.autoPlay) {
      clearInterval(this.autoPlay);
      this.autoPlay = undefined;
    }
    if (!autoPlay && this.props.autoPlay && !this.autoPlay) {
      this.autoPlay = setInterval(this.next, this.props.autoPlaySpeed);
    }
    if (this.props.infinite) {
      // this is to quicly cancel the animation and move the items position to create the infinite effects.
      this.correctClonesPosition({ domLoaded, isSliding });
    }
  }
  public correctClonesPosition({
    domLoaded,
    isSliding
  }: {
    domLoaded?: boolean;
    isSliding?: boolean;
  }): void {
    const childrenArr = React.Children.toArray(this.props.children);
    const {
      hasEnterClonedAfter,
      hasEnterClonedBefore,
      nextSlide,
      nextPosition
    } = whenEnteredClones(this.state, childrenArr, this.props);
    if (
      // this is to prevent this gets called on the server-side.
      this.state.domLoaded &&
      domLoaded &&
      isSliding &&
      !this.state.isSliding
    ) {
      if (hasEnterClonedAfter || hasEnterClonedBefore) {
        this.isAnimationAllowed = false;
        setTimeout(() => {
          this.setState({
            transform: nextPosition,
            currentSlide: nextSlide
          });
        }, this.props.transitionDuration || defaultTransitionDuration);
      }
    }
  }
  public next(slidesHavePassed = 0): void {
    const { slidesToShow } = this.state;
    const { slidesToSlide, infinite, afterChange, beforeChange } = this.props;
    const nextMaximumSlides =
      this.state.currentSlide +
      1 +
      slidesHavePassed +
      slidesToShow +
      (slidesHavePassed > 0 ? 0 : slidesToSlide);
    const nextSlides =
      this.state.currentSlide +
      slidesHavePassed +
      (slidesHavePassed > 0 ? 0 : slidesToSlide);
    const nextPosition = -(this.state.itemWidth * nextSlides);
    const previousSlide = this.state.currentSlide;
    if (nextMaximumSlides <= this.state.totalItems) {
      // It means if we have next slides go back to on the right-hand side.
      if (typeof beforeChange === "function") {
        beforeChange(nextSlides, this.getState());
      }
      this.isAnimationAllowed = true;
      this.setState(
        {
          isSliding: true,
          transform: nextPosition,
          currentSlide: nextSlides
        },
        () => {
          this.setState({ isSliding: false });
          if (typeof afterChange === "function") {
            setTimeout(() => {
              afterChange(previousSlide, this.getState());
            }, this.props.transitionDuration || defaultTransitionDuration);
          }
        }
      );
    } else if (
      nextMaximumSlides > this.state.totalItems &&
      this.state.currentSlide !== this.state.totalItems - slidesToShow
    ) {
      // This is to prevent oversliding
      // This is not for inifinite mode as for inifinite mode is never over-sliding.
      const maxSlides = this.state.totalItems - slidesToShow;
      const maxPosition = -(this.state.itemWidth * maxSlides);
      if (typeof beforeChange === "function") {
        beforeChange(maxSlides, this.getState());
      }
      this.isAnimationAllowed = true;
      this.setState(
        {
          isSliding: true,
          transform: maxPosition,
          currentSlide: maxSlides
        },
        () => {
          this.setState({ isSliding: false });
          if (typeof afterChange === "function") {
            setTimeout(() => {
              afterChange(previousSlide, this.getState());
            }, this.props.transitionDuration || defaultTransitionDuration);
          }
        }
      );
    } else {
      return;
    }
  }
  public previous(slidesHavePassed = 0): void {
    const { slidesToShow } = this.state;
    const { slidesToSlide, infinite, afterChange, beforeChange } = this.props;
    const nextSlides =
      this.state.currentSlide -
      slidesHavePassed -
      (slidesHavePassed > 0 ? 0 : slidesToSlide);
    const nextPosition = -(this.state.itemWidth * nextSlides);
    const previousSlide = this.state.currentSlide;
    if (nextSlides >= 0) {
      // It means if we have next slides go back to on the left-hand side.
      if (typeof beforeChange === "function") {
        beforeChange(nextSlides, this.getState());
      }
      this.isAnimationAllowed = true;
      this.setState(
        {
          isSliding: true,
          transform: nextPosition,
          currentSlide: nextSlides
        },
        () => {
          this.setState({ isSliding: false });
          if (typeof afterChange === "function") {
            setTimeout(() => {
              afterChange(previousSlide, this.getState());
            }, this.props.transitionDuration || defaultTransitionDuration);
          }
        }
      );
    } else if (nextSlides < 0 && this.state.currentSlide !== 0) {
      // prevent oversliding.
      // it means the user has almost scrolling over to what we have.
      // this is not for infinite mode as infinite mode always has items to go back to.
      if (typeof beforeChange === "function") {
        beforeChange(0, this.getState());
      }
      this.isAnimationAllowed = true;
      this.setState(
        {
          isSliding: true,
          transform: 0,
          currentSlide: 0
        },
        () => {
          this.setState({ isSliding: false });
          if (typeof afterChange === "function") {
            setTimeout(() => {
              afterChange(previousSlide, this.getState());
            }, this.props.transitionDuration || defaultTransitionDuration);
          }
        }
      );
    } else {
      return;
    }
  }
  public componentWillUnmount(): void {
    window.removeEventListener("resize", this.onResize);
    if (this.props.keyBoardControl) {
      window.removeEventListener("keyup", this.onKeyUp);
    }
    if (this.props.autoPlay && this.autoPlay) {
      clearInterval(this.autoPlay);
      this.autoPlay = undefined;
    }
  }
  public resetMoveStatus(): void {
    this.onMove = false;
    this.initialPosition = 0;
    this.lastPosition = 0;
    this.direction = "";
  }
  public handleDown(e: any): void {
    if (
      (e.touches && !this.props.swipeable) ||
      (e && !e.touches && !this.props.draggable) ||
      (this.isInThrottle && this.props.infinite)
    ) {
      return;
    }
    const { clientX } = e.touches ? e.touches[0] : e;
    this.onMove = true;
    this.initialPosition = clientX;
    this.lastPosition = clientX;
    this.isAnimationAllowed = false;
  }
  public handleMove(e: any): void {
    if (
      (e.touches && !this.props.swipeable) ||
      (e && !e.touches && !this.props.draggable)
    ) {
      return;
    }
    const { clientX } = e.touches ? e.touches[0] : e;
    if (e.touches && this.autoPlay && this.props.autoPlay) {
      clearInterval(this.autoPlay);
      this.autoPlay = undefined;
    }
    if (this.onMove) {
      // making sure we have items to slide back to, prevent oversliding.
      const slidesHavePassedRight = Math.round(
        (this.initialPosition - this.lastPosition) / this.state.itemWidth
      );
      // making sure we have items to slide back to, prevent oversliding.
      const slidesHavePassedLeft = Math.round(
        (this.lastPosition - this.initialPosition) / this.state.itemWidth
      );
      if (
        this.initialPosition > clientX &&
        slidesHavePassedRight <= this.state.slidesToShow
      ) {
        this.direction = "right";
        const translateXLimit = Math.abs(
          -(
            this.state.itemWidth *
            (this.state.totalItems - this.state.slidesToShow)
          )
        );
        const nextTranslate =
          this.state.transform - (this.lastPosition - clientX);
        const isLastSlide =
          this.state.currentSlide ===
          this.state.totalItems - this.state.slidesToShow;
        if (
          Math.abs(nextTranslate) <= translateXLimit ||
          (isLastSlide && this.props.infinite)
        ) {
          this.setState({ transform: nextTranslate });
        }
      }
      if (
        clientX > this.initialPosition &&
        slidesHavePassedLeft <= this.state.slidesToShow
      ) {
        this.direction = "left";
        const nextTranslate =
          this.state.transform + (clientX - this.lastPosition);
        const isFirstSlide = this.state.currentSlide === 0;
        if (nextTranslate <= 0 || (isFirstSlide && this.props.infinite)) {
          this.setState({ transform: nextTranslate });
        }
      }
      this.lastPosition = clientX;
    }
  }
  public handleOut(e: any): void {
    if (this.props.autoPlay && !this.autoPlay) {
      this.autoPlay = setInterval(this.next, this.props.autoPlaySpeed);
    }
    const shouldDisableOnMobile =
      e.type === "touchend" && !this.props.swipeable;
    const shouldDisableOnDesktop =
      (e.type === "mouseleave" || e.type === "mouseup") &&
      !this.props.draggable;
    if (shouldDisableOnMobile || shouldDisableOnDesktop) {
      return;
    }
    if (this.onMove) {
      if (this.direction === "right") {
        const slidesHavePassed = Math.round(
          (this.initialPosition - this.lastPosition) / this.state.itemWidth
        );
        if (
          this.initialPosition - this.lastPosition >=
          this.props.minimumTouchDrag
        ) {
          this.next(slidesHavePassed);
        } else {
          this.correctItemsPosition(this.state.itemWidth, true);
        }
      }
      if (this.direction === "left") {
        const slidesHavePassed = Math.round(
          (this.lastPosition - this.initialPosition) / this.state.itemWidth
        );
        if (
          this.lastPosition - this.initialPosition >
          this.props.minimumTouchDrag
        ) {
          this.previous(slidesHavePassed);
        } else {
          this.correctItemsPosition(this.state.itemWidth, true);
        }
      }
      this.resetMoveStatus();
    }
  }
  public onKeyUp(e: any): void {
    switch (e.keyCode) {
      case 37:
        return this.previous();
      case 39:
        return this.next();
    }
  }
  public handleEnter(): void {
    if (this.autoPlay && this.props.autoPlay) {
      clearInterval(this.autoPlay);
      this.autoPlay = undefined;
    }
  }

  public goToSlide(slide: number): void {
    const { itemWidth } = this.state;
    const { afterChange, beforeChange } = this.props;
    const previousSlide = this.state.currentSlide;
    if (typeof beforeChange === "function") {
      beforeChange(slide, this.getState());
    }
    this.isAnimationAllowed = true;
    this.setState(
      {
        currentSlide: slide,
        transform: -(itemWidth * slide)
      },
      () => {
        if (this.props.infinite) {
          this.correctClonesPosition({ domLoaded: true, isSliding: true });
        }
        if (typeof afterChange === "function") {
          setTimeout(() => {
            afterChange(previousSlide, this.getState());
          }, this.props.transitionDuration || defaultTransitionDuration);
        }
      }
    );
  }
  public getState(): any {
    return {
      ...this.state,
      onMove: this.onMove,
      direction: this.direction
    };
  }
  public renderLeftArrow(): React.ReactNode {
    const { customLeftArrow } = this.props;
    return (
      <LeftArrow
        customLeftArrow={customLeftArrow}
        getState={() => this.getState()}
        previous={this.previous}
      />
    );
  }
  public renderRightArrow(): React.ReactNode {
    const { customRightArrow } = this.props;
    return (
      <RightArrow
        customRightArrow={customRightArrow}
        getState={() => this.getState()}
        next={this.next}
      />
    );
  }
  public renderButtonGroups(): React.ReactElement<any> | null {
    const { customButtonGroup } = this.props;
    if (customButtonGroup) {
      return React.cloneElement(customButtonGroup, {
        previous: () => this.previous(),
        next: () => this.next(),
        goToSlide: (slideIndex: number) => this.goToSlide(slideIndex),
        carouselState: this.getState()
      });
    }
    return null;
  }
  public renderDotsList(): React.ReactElement<any> | null {
    return (
      <Dots
        state={this.state}
        props={this.props}
        goToSlide={this.goToSlide}
        getState={() => this.getState()}
      />
    );
  }
  public renderCarouselItems(): any {
    return <CarouselItems state={this.state} props={this.props} />;
  }

  public render(): React.ReactNode {
    const { slidesToShow } = this.state;
    const {
      deviceType,
      slidesToSlide,
      arrows,
      removeArrowOnDeviceType,
      infinite,
      containerClass,
      sliderClass,
      customTransition,
      partialVisbile
    } = this.props;
    const { shouldRenderOnSSR, paritialVisibilityGutter } = getInitialState(
      this.state,
      this.props
    );
    const isLeftEndReach = !(this.state.currentSlide - slidesToSlide >= 0);
    const isRightEndReach = !(
      this.state.currentSlide + 1 + slidesToShow <=
      this.state.totalItems
    );
    const shouldShowArrows =
      arrows &&
      !(
        removeArrowOnDeviceType &&
        ((deviceType && removeArrowOnDeviceType.indexOf(deviceType) > -1) ||
          (this.state.deviceType &&
            removeArrowOnDeviceType.indexOf(this.state.deviceType) > -1))
      );
    const disableLeftArrow = !infinite && isLeftEndReach;
    const disableRightArrow = !infinite && isRightEndReach;

    // this is formular will be fixed once i find a better way.
    const currentTransform =
      paritialVisibilityGutter && partialVisbile
        ? partialVisbile === "right"
          ? this.state.transform +
            this.state.currentSlide * paritialVisibilityGutter
          : this.state.transform +
            this.state.currentSlide * paritialVisibilityGutter +
            (this.state.currentSlide === 0
              ? 0
              : paritialVisibilityGutter + paritialVisibilityGutter / 2)
        : this.state.transform;
    return (
      <div
        className={`react-multi-carousel-list ${containerClass}`}
        ref={this.containerRef}
      >
        <ul
          className={`react-multi-carousel-track ${sliderClass}`}
          // @ts-ignore
          style={{
            transition: this.isAnimationAllowed
              ? customTransition || defaultTransition
              : "none",
            overflow: shouldRenderOnSSR ? "hidden" : "unset",
            transform: `translate3d(${currentTransform}px,0,0)`
          }}
          onMouseMove={this.handleMove}
          onMouseDown={this.handleDown}
          onMouseUp={this.handleOut}
          onMouseEnter={this.handleEnter}
          onMouseLeave={this.handleOut}
          onTouchStart={this.handleDown}
          onTouchMove={this.handleMove}
          onTouchEnd={this.handleOut}
        >
          {this.renderCarouselItems()}
        </ul>
        {shouldShowArrows && !disableLeftArrow && this.renderLeftArrow()}
        {shouldShowArrows && !disableRightArrow && this.renderRightArrow()}
        {this.renderButtonGroups()}
        {this.renderDotsList()}
      </div>
    );
  }
}
export default Carousel;
