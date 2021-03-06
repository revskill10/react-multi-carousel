import * as React from "react";
import { CarouselInternalState, CarouselProps } from "./types";
declare class Carousel extends React.Component<CarouselProps, CarouselInternalState> {
    static defaultProps: any;
    private readonly containerRef;
    onMove: boolean;
    initialPosition: number;
    lastPosition: number;
    isAnimationAllowed: boolean;
    direction: string;
    autoPlay?: any;
    isInThrottle?: boolean;
    constructor(props: CarouselProps);
    setIsInThrottle(isInThrottle?: boolean): void;
    componentDidMount(): void;
    setClones(slidesToShow: number, itemWidth?: number, forResizing?: boolean): void;
    setItemsToShow(shouldCorrectItemPosition?: boolean): void;
    setContainerAndItemWidth(slidesToShow: number, shouldCorrectItemPosition?: boolean): void;
    correctItemsPosition(itemWidth: number, isAnimationAllowed?: boolean): void;
    onResize(value?: any): void;
    componentDidUpdate({ keyBoardControl, autoPlay }: CarouselProps, { containerWidth, domLoaded, isSliding }: CarouselInternalState): void;
    correctClonesPosition({ domLoaded, isSliding }: {
        domLoaded?: boolean;
        isSliding?: boolean;
    }): void;
    next(slidesHavePassed?: number): void;
    previous(slidesHavePassed?: number): void;
    componentWillUnmount(): void;
    resetMoveStatus(): void;
    handleDown(e: any): void;
    handleMove(e: any): void;
    handleOut(e: any): void;
    onKeyUp(e: any): void;
    handleEnter(): void;
    goToSlide(slide: number): void;
    getState(): any;
    renderLeftArrow(): React.ReactNode;
    renderRightArrow(): React.ReactNode;
    renderButtonGroups(): React.ReactElement<any> | null;
    renderDotsList(): React.ReactElement<any> | null;
    renderCarouselItems(): any;
    render(): React.ReactNode;
}
export default Carousel;
