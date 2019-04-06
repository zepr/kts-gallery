import Zepr = require('zepr.ts');



class ImageTools {

    static getTransparentImage(src: HTMLImageElement, reverse: boolean = false): HTMLImageElement {
        let dest = document.createElement<'img'>('img');
        let offCanvas: HTMLCanvasElement;
        let offCtx: CanvasRenderingContext2D;
    
        // Create offscreen canvas
        offCanvas = document.createElement('canvas');
        offCtx = offCanvas.getContext('2d');

        // Resize
        offCanvas.width = src.width;
        offCanvas.height = src.height;

        // Copy
        offCtx.drawImage(src, 0, 0);

        // Retrieve data
        let ratio: number = 256 / 224;
        let img: ImageData = offCtx.getImageData(0, 0, src.width, src.height);
        for (let i = 0; i < img.data.length; i += 4) {
            img.data[i + 3] = Math.min(Math.max(0, ratio * (img.data[i] - 32)), 255);
            if (reverse) {
                img.data[i] = 255 - img.data[i];
                img.data[i + 1] = 255 - img.data[i + 1];
                img.data[i + 2] = 255 - img.data[i + 2];
            }
        }

        // Push data
        offCtx.putImageData(img, 0, 0);

        // Transfer image
        dest.src = offCanvas.toDataURL();

        return dest;
    }
}



interface Drawing {
    src: string;
    title: string;
}



class PictureSprite extends Zepr.RawSprite<Zepr.Rectangle> {

    static readonly AREA: Array<Zepr.Rectangle> = [
        new Zepr.Rectangle(400, 297, 407, 261),
        new Zepr.Rectangle(398, 309, 225, 351)
    ];

    private image: HTMLImageElement;
    private ratio: number;
    private orientation: number;

    public constructor(position: Zepr.Rectangle) {
        super(position, 100);

        this.image = document.createElement<'img'>('img');
    }

    private getRatio(image: HTMLImageElement, rect: Zepr.Rectangle): number {
        return Math.min(1, Math.min(rect.height / image.height, rect.width / image.width));
    }

    setImage(newImage: HTMLImageElement): number {
        // eval orientation
        let rh: number = this.getRatio(newImage, PictureSprite.AREA[0]);
        let rv: number = this.getRatio(newImage, PictureSprite.AREA[1]);
        if (rv > rh) {
            this.orientation = 1;
            this.ratio = rv;
        } else {
            this.orientation = 0;
            this.ratio = rh;
        }

        this.image = ImageTools.getTransparentImage(newImage);

        // Return orientation
        return this.orientation;
    }


    render(context: CanvasRenderingContext2D): void {
        if (this.ratio) {
            context.save();
            context.translate(PictureSprite.AREA[this.orientation].x, PictureSprite.AREA[this.orientation].y);
            context.scale(this.ratio, this.ratio);
            context.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
            context.restore();
        }
    }
}



class PictureScreen implements Zepr.GameScreen, Zepr.ClickListener {

    images: Array<string> = ['../../images/ch.jpg', '../../images/cv.jpg', 
        '../../images/next.png', '../../images/previous.png', '../../images/exit.png'];

    private static readonly FONT: Zepr.Font = new Zepr.Font('Quicksand', 24, '#000000');

    private static readonly TEXTAREA: Array<Zepr.TextSprite> = [
        new Zepr.TextSprite('', new Zepr.Rectangle(386, 673, 239, 76, Math.PI * .8 / 180 ), PictureScreen.FONT, Zepr.TextAlign.CENTER),
        new Zepr.TextSprite('', new Zepr.Rectangle(396, 701, 210, 76, Math.PI * 1.2 / 180 ), PictureScreen.FONT, Zepr.TextAlign.CENTER)
    ];

    private rawPicture: HTMLImageElement;
    private picture: PictureSprite;
    private gallery: Array<Drawing>;
    private galleryIndex: number;

    private controlExit: Zepr.ImageSprite;
    private controlPrevious: Zepr.ImageSprite;
    private controlNext: Zepr.ImageSprite;

    private wait: boolean;

    init(engine: Zepr.Engine): void {

        this.galleryIndex = 0;

        // Picture
        this.picture = new PictureSprite(new Zepr.Rectangle(400, 400, 800, 800));
        engine.addSprite(this.picture);

        // Controls
        this.controlExit = new Zepr.ImageSprite(engine.getImage('../../images/exit.png'), new Zepr.Rectangle(760, 40, 60, 60), 2);
        engine.addSprite(this.controlExit);
        this.controlPrevious = new Zepr.ImageSprite(engine.getImage('../../images/previous.png'), new Zepr.Rectangle(60, 300, 60, 120), 2);
        this.controlNext = new Zepr.ImageSprite(engine.getImage('../../images/next.png'), new Zepr.Rectangle(740, 300, 60, 120), 2);

        // Load gallery
        Zepr.Net.get('gallery.json', (message: any): void => {
            this.gallery = <Array<Drawing>>message;
            this.loadPicture(engine);
        });            
    }


    private loadPicture(engine: Zepr.Engine): void {

        this.wait = true;

        this.rawPicture = new Image();
        this.rawPicture.onload = (): void => {
            let orientation: number = this.picture.setImage(this.rawPicture);            
            engine.setBackground(this.images[orientation], Zepr.Background.OVERFLOW);

            // Text
            engine.removeSprite(PictureScreen.TEXTAREA[1 - orientation]);
            PictureScreen.TEXTAREA[orientation].setText(this.gallery[this.galleryIndex].title);
            engine.addSprite(PictureScreen.TEXTAREA[orientation]);

            // Controls
            if (this.galleryIndex == 0) {
                engine.removeSprite(this.controlPrevious);
            } else {
                engine.addSprite(this.controlPrevious);
            }

            if (this.galleryIndex == this.gallery.length - 1) {
                engine.removeSprite(this.controlNext);
            } else {
                engine.addSprite(this.controlNext);
            }

            this.wait = false;
        } 
        this.rawPicture.src = 'drawings/' + this.gallery[this.galleryIndex].src;
    }

    run(engine: Zepr.Engine): void {

    }

    onClick(engine: Zepr.Engine, point: Zepr.Point, sprites: Zepr.Sprite<any>[]): void {

        if (this.wait) return;

        switch(sprites[0]) {
            case this.controlExit:
                window.history.back();
                break;
            case this.controlNext:
                this.galleryIndex++;
                this.loadPicture(engine);
                break;
            case this.controlPrevious:
                this.galleryIndex--;
                this.loadPicture(engine);
                break;
            default:
        }
    }
}


window.onload = () => {
    let engine = new Zepr.Engine(800, 800);
    engine.addScreen('main', new PictureScreen());
    engine.enableMouseControl(true);
    engine.start('main');
};
