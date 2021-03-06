// Copyright 2017 duncan law (mrdunk@gmail.com)

import * as Konva from "konva";
import {CommandBuffer, ICommand} from "./command_buffer";
import {ComponentBuffer, IComponent} from "./component_buffer";
import {ImageLoader} from "./image_loader";

const snapDistance = 5;
const gridSize = 50;
const defaultNewLinePos = [20, 20, 20, 120];
const defaultNewLinePos2 = [-defaultNewLinePos[0],
                            defaultNewLinePos[1],
                            -defaultNewLinePos[2],
                            defaultNewLinePos[3]];

class MovableLineCap extends Konva.Circle {
  constructor(private capNo: number, private line: MovableLine) {
    super({
      radius: 6,
      stroke: "black",
      strokeWidth: 2,
      fill: "lightblue",
      draggable: true,
    });

    const mirrorSide: number = capNo <= 1 ? 0:1;

    let name = this.line.name();
    name += (this.capNo > 0) ? "_a" : "_b";
    name += (this.capNo > 1) ? "" : "2";
    this.name(name);

    this.on("mouseover", () => {
      this.line.hoverHighlight(true, mirrorSide);
      this.fill("red");
      this.draw();
      document.body.style.cursor = "pointer";
    });
    this.on("mouseout", () => {
      this.line.hoverHighlight(false, mirrorSide);
      document.body.style.cursor = "default";
    });
    this.on("dragstart", () => {
      console.log(this.name(), capNo, mirrorSide);
      this.fill("yellow");
      this.draw();
      this.line.moving(true, mirrorSide);
    });
    this.on("dragend", () => {
      this.fill("lightblue");
      this.draw();
      this.line.movedCap(mirrorSide);
      this.line.moving(false, mirrorSide);
    });
    this.on("dragmove", () => {
      this.fill("yellow");
      this.draw();
      this.line.movedCap(mirrorSide);
      this.line.select();
    });
    this.on("click", () => {
      this.line.select();
    });
  }
}

class MovableLineLine extends Konva.Line {
  constructor(private mirrorSide: number, private line: MovableLine) {
    super({
      points: [],
      stroke: "black",
      strokeWidth: 5,
      draggable: false,
    });

    this.name(line.name());

    this.on("mouseover", () => {
      this.line.hoverHighlight(true, mirrorSide);
      document.body.style.cursor = "pointer";
    });
    this.on("mouseout", () => {
      this.line.hoverHighlight(false, mirrorSide);
      document.body.style.cursor = "default";
    });
    this.on("click", () => {
      this.line.select();
    });
  }

}

export class MovableLine extends Konva.Group {
  public static counter: number = 0;

  public static makeName(): string {
    const returnValue = "line_" + MovableLine.counter;
    MovableLine.counter++;
    return returnValue;
  }

  public a: MovableLineCap;
  public b: MovableLineCap;
  public line: MovableLineLine;
  public a2: MovableLineCap;
  public b2: MovableLineCap;
  public line2: MovableLineLine;
  public mirrored: boolean;

  constructor(private lineSelectCallback: (lineName: string)=>void,
              public rib: number,
              private neighbours: {[name: string]: MovableLine},
              private overideName?: string,
              public options?: [string]) {
    super();
    if(overideName) {
      this.name(overideName);
    } else {
      this.name(MovableLine.makeName());
    }
    this.options = this.options || ([] as [string]);
    this.mirrored = this.options && this.options.indexOf("mirror") >= 0;

    this.line = new MovableLineLine(0, this);
    this.a = new MovableLineCap(0, this);
    this.b = new MovableLineCap(1, this);
    this.line.points(defaultNewLinePos.slice());
    this.a.x(this.line.points()[0]);
    this.a.y(this.line.points()[1]);
    this.b.x(this.line.points()[2]);
    this.b.y(this.line.points()[3]);
    this.add(this.line);
    this.add(this.a);
    this.add(this.b);

    this.syncroniseMirroring();
    this.storeComponent();
  }

  public destroy() {
    ComponentBuffer.remove(this.rib, this.name());
    return super.destroy();
  }

  public movedCap(mirrorSide: number) {
    this.snap(mirrorSide);
    this.storeAction("lineMove", mirrorSide);
  }

  public getPoints() {
    return [[this.a.x(), this.a.y()], [this.b.x(), this.b.y()]];
  }

  public setPosition(command: ICommand) {
    const index = this.options.indexOf("mirror");
    if(index < 0 &&
       command.options &&
       command.options.indexOf("mirror") >= 0) {
      this.options.push("mirror");
    } else if(index >= 0 &&
              command.options &&
              command.options.indexOf("mirror") < 0) {
      this.options.splice(index, 1);
    }

    this.mirrored = this.options.indexOf("mirror") >= 0;

    if(command.xa === undefined || command.ya === undefined ||
       command.xb === undefined || command.yb === undefined) {
      this.a.x(defaultNewLinePos[0]);
      this.a.y(defaultNewLinePos[1]);
      this.b.x(defaultNewLinePos[2]);
      this.b.y(defaultNewLinePos[3]);
    } else {
      this.a.x(command.xa);
      this.a.y(command.ya);
      this.b.x(command.xb);
      this.b.y(command.yb);
    }

    const points = this.line.points();
    points[0] = this.a.x();
    points[1] = this.a.y();
    points[2] = this.b.x();
    points[3] = this.b.y();

    this.syncroniseMirroring();
    this.draw();
    this.storeComponent();
  }

  public select() {
    this.lineSelectCallback(this.name());
  }

  public selectHighlight(mirrorSide: number) {
    if(this.options.indexOf("selected") < 0) {
      this.options.push("selected");
    }
    this.line.stroke("red");
    this.line.draw();
    if(this.mirrored) {
      this.line2.stroke("red");
      this.line2.draw();
    }
  }

  public unSelectHighlight() {
    console.log(this.line);
    const optionsIndex = this.options.indexOf("selected");
    if(optionsIndex >= 0) {
      this.options.splice(optionsIndex, 1);
      this.hoverHighlight(false, 0);
      this.hoverHighlight(false, 1);
    }
  }

  public unSelectHighlightAll() {
    for(const key in this.neighbours) {
      if(!this.neighbours.hasOwnProperty(key)) {
        continue;
      }
      const neighbour = this.neighbours[key];
      const optionsIndex = neighbour.options.indexOf("selected");
      if(optionsIndex >= 0) {
        neighbour.options.splice(optionsIndex, 1);
        neighbour.hoverHighlight(false, 0);
        neighbour.hoverHighlight(false, 1);
      }
    }
  }

  public hoverHighlight(state: boolean, mirrorSide: number) {
    if(mirrorSide > 0 && !this.mirrored) {
      return;
    }

    if(!this.line) {
      return;
    }

    let line = this.line;
    let a = this.a;
    let b = this.b;
    if(mirrorSide > 0) {
      line = this.line2;
      a = this.a2;
      b = this.b2;
    }

    if(this.options.indexOf("selected") >= 0) {
      return;
    }

    if(state) {
      line.stroke("darkorange");
      a.fill("darkorange");
      b.fill("darkorange");
      line.draw();
      a.draw();
      b.draw();
      return;
    }

    line.stroke("black");
    a.fill("lightblue");
    b.fill("lightblue");
    line.draw();
    a.draw();
    b.draw();
  }

  public moving(state: boolean, mirrorSide: number) {
    let line = this.line;
    let a = this.a;
    let b = this.b;
    if(mirrorSide > 0) {
      line = this.line2;
      a = this.a2;
      b = this.b2;
    }

    if(state) {
      line.dash([10, 5]);
      line.draw();
      a.draw();
      b.draw();
      return;
    }

    line.dash([]);
    line.draw();
    a.draw();
    b.draw();
  }

  private snap(mirrorSide: number) {
    let line = this.line;
    let a = this.a;
    let b = this.b;
    if(mirrorSide > 0) {
      line = this.line2;
      a = this.a2;
      b = this.b2;
    }

    a.x(snapDistance * Math.round(a.x() / snapDistance));
    a.y(snapDistance * Math.round(a.y() / snapDistance));
    b.x(snapDistance * Math.round(b.x() / snapDistance));
    b.y(snapDistance * Math.round(b.y() / snapDistance));

    for(const key in ComponentBuffer.buffer[this.rib]) {
      if(!ComponentBuffer.buffer[this.rib].hasOwnProperty(key)) {
        continue;
      }
      const component = ComponentBuffer.buffer[this.rib][key];
      if(component.name === this.name()) {
        continue;
      } else if(Math.abs(component.xa - a.x()) +
                 Math.abs(component.ya - a.y()) < snapDistance *2) {
        a.x(component.xa);
        a.y(component.ya);
        break;
      } else if(Math.abs(component.xb - a.x()) +
                Math.abs(component.yb - a.y()) < snapDistance *2) {
        a.x(component.xb);
        a.y(component.yb);
        break;
      } else if(Math.abs(component.xa - b.x()) +
                Math.abs(component.ya - b.y()) < snapDistance *2) {
        b.x(component.xa);
        b.y(component.ya);
        break;
      } else if(Math.abs(component.xb - b.x()) +
                Math.abs(component.yb - b.y()) < snapDistance *2) {
        b.x(component.xb);
        b.y(component.yb);
        break;
      }
    }
  }

  private syncroniseMirroring() {
    if(!this.mirrored) {
      if(this.line2 !== undefined) {
        this.line2.visible(false);
        this.a2.visible(false);
        this.b2.visible(false);
      }
      return;
    }

    if(this.line2 === undefined) {
      this.line2 = new MovableLineLine(1, this);
      this.a2 = new MovableLineCap(2, this);
      this.b2 = new MovableLineCap(3, this);
      this.syncroniseMirroring();
      this.add(this.line2);
      this.add(this.a2);
      this.add(this.b2);
    }
    this.line2.visible(true);
    this.a2.visible(true);
    this.b2.visible(true);

    this.a2.x(-this.a.x());
    this.a2.y(this.a.y());
    this.b2.x(-this.b.x());
    this.b2.y(this.b.y());
    const points = this.line.points().slice();
    points[0] = -points[0];
    points[2] = -points[2];
    this.line2.points(points);
  }

  /* Saves command to buffer and call callbacks which are interested in command.
   * This class is one of those callbacks so a command originating in this
   * class still has to go through this method. */
  private storeAction(actionType: string, mirrorSide: number) {
    let xa = this.a.x();
    let xb = this.b.x();
    let ya = this.a.y();
    let yb = this.b.y();
    if(mirrorSide > 0) {
      xa = -this.a2.x();
      xb = -this.b2.x();
      ya = this.a2.y();
      yb = this.b2.y();
    }

    const options: [string] = [] as [string];
    if(this.mirrored) {
      options.push("mirror");
    }
    const command: ICommand = {
      action: actionType,
      name: this.name(),
      rib: this.rib,
      time: Date.now(),
      xa, ya, xb, yb,
      options,
    };
    CommandBuffer.push(command);
  }

  private storeComponent() {
    const component: IComponent = {
      name: this.name(),
      rib: this.rib,
      xa: this.a.x(),
      ya: this.a.y(),
      xb: this.b.x(),
      yb: this.b.y(),
      options: this.options,
    };
    ComponentBuffer.push(component);
  }
}

export class StaticLine extends Konva.Group {
  constructor(private component: IComponent) {
    super();
    this.name(component.name);

    let ya = component.ya;
    let yb = component.yb;
    if(component.xa === undefined || component.ya === undefined ||
       component.xb === undefined || component.yb === undefined) {
      // This is probably a lineNew.
      ya = defaultNewLinePos[1];
      yb = defaultNewLinePos[3];
    }

    const ribXPos = ComponentBuffer.positionRib[component.rib];
    const line = new Konva.Line({
      points: [ribXPos, ya, ribXPos, yb],
      stroke: "black",
      strokeWidth: 5,
    });
    this.add(line);

    const capA = new Konva.Circle({
      x: ribXPos,
      y: ya,
      stroke: "black",
      strokeWidth: 1,
      radius: 3,
      fill: "red",
    });
    this.add(capA);

    const capB = new Konva.Circle({
      x: ribXPos,
      y: yb,
      stroke: "black",
      strokeWidth: 1,
      radius: 3,
      fill: "red",
    });
    this.add(capB);
  }
}

export interface IScaleBackgroundImage {
  imageUrl?: string;
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
}

export class Scale extends Konva.Group {
  public grid: Konva.Group;
  private backgroundImage: Konva.Image;

  constructor(private imageUrl: string) {
    super();
    this.listening(false);

    this.updateBackgroundImage({imageUrl});
  }

  public updateBackgroundImage(imagePerams) {
    console.log(imagePerams);
    if(imagePerams.imageUrl !== undefined) {
      this.imageUrl = imagePerams.imageUrl;
      ImageLoader.get(this.imageUrl, (imageObj) => {
        this.backgroundImage = new Konva.Image({
          x: this.width() / 2,
          y: this.height() / 2,
          image: imageObj,
          width: imageObj.width,
          height: imageObj.height,
          opacity: 0.7,
        });
        this.draw();
        this.getStage().draw();
      });
    }

    if(this.backgroundImage &&
       imagePerams.offsetX !== undefined &&
       imagePerams.offsetY !== undefined) {
      this.backgroundImage.x(-imagePerams.offsetX);
      this.backgroundImage.y(-imagePerams.offsetY);
      this.backgroundImage.scaleX(imagePerams.scaleX);
      this.backgroundImage.scaleY(imagePerams.scaleY);

      this.draw();
      this.getStage().draw();
    }
  }

  public draw(): Konva.Node {
    this.destroyChildren();

    const stage = this.getStage();
    this.width(stage.width());
    this.height(stage.height());

    const water = new Konva.Rect({
      width: this.width(),
      height: this.height() / 2,
      y: 0,
      x: - this.width() / 2,
      fill: "#88C0CA",
    });
    this.add(water);

    const sky = new Konva.Rect({
      width: this.width(),
      height: this.height() / 2,
      y: - this.height() / 2,
      x: - this.width() / 2,
      fill: "#C4E0E5",
    });
    this.add(sky);

    if(this.backgroundImage) {
      this.add(this.backgroundImage);
      this.backgroundImage.draw();
    }

    this.grid = new Konva.Group();
    this.add(this.grid);
    const xStart = -Math.round(this.width() / 2 / gridSize) * gridSize;
    const YStart = -Math.round(this.height() / 2 / gridSize) * gridSize;
    for(let x = xStart; x < this.width() / 2; x += gridSize) {
      const stroke = "darkgrey";
      const strokeWidth = 1;
      const vertical = new Konva.Line({
        points: [x, - this.height() / 2, x, this.height() / 2],
        stroke,
        strokeWidth,
      });
      this.grid.add(vertical);
    }
    for(let y = YStart; y < this.height() / 2; y += gridSize) {
      const horizontal = new Konva.Line({
        points: [- this.width() / 2, y, this.width() / 2, y],
        stroke: "darkGrey",
      });
      this.grid.add(horizontal);
    }

    this.moveToBottom();
    const centre = new Konva.Circle({
      radius: 10,
      stroke: "black",
      strokeWidth: 2,
    });
    this.add(centre);

    return super.draw();
  }
}

export class AllRibs extends Konva.Group {
  public rib: number;

  constructor() {
    super();
    this.listening(false);
    this.rib = 0;
  }

  public draw(): Konva.Node {
    this.destroyChildren();

    for(const rib in ComponentBuffer.buffer) {
      if(!ComponentBuffer.buffer.hasOwnProperty(rib)) {
        continue;
      }
      for(const name in ComponentBuffer.buffer[rib]) {
        if(!ComponentBuffer.buffer[rib].hasOwnProperty(name)) {
          continue;
        }
        const data = ComponentBuffer.buffer[rib][name];
        const line = new Konva.Line({
          points: [data.xa, data.ya, data.xb, data.yb],
          stroke: "black",
          strokeWidth: 1,
        });
        this.add(line);
        if(data.options.indexOf("mirror") < 0) {
          continue;
        }
        const line2 = new Konva.Line({
          points: [-data.xa, data.ya, -data.xb, data.yb],
          stroke: "black",
          strokeWidth: 1,
        });
        this.add(line2);
      }
    }
    return super.draw();
  }
}

export class Modal {
  public element: HTMLDivElement;
  private background: HTMLDivElement;

  constructor() {
    this.background =
      document.getElementById("modalBackground") as HTMLDivElement;
    this.element = document.getElementById("modalContent") as HTMLDivElement;
    this.background.addEventListener("click", this.hide.bind(this));
    // this.element.addEventListener("click", this.hide.bind(this));
    this.hide();
  }

  public show() {
    console.log("Modal.show()");
    this.background.style.display = "block";
    this.element.style.display = "block";
  }

  public hide() {
    this.background.style.display = "none";
    this.element.style.display = "none";
  }

  public clear() {
    while(this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
    // this.element.innerHTML = "";
  }

  public add(content: HTMLDivElement) {
    this.element.appendChild(content);
  }
}

export class BackgroundImage extends Konva.Group {
  public image: Konva.Image;
  private boxCrossSection: Konva.Group;
  private boxLengthSection: Konva.Group;
  private crossPosX: number;
  private crossPosY: number;
  private lengthPosX: number;
  private lengthPosY: number;
  private readonly boxWidth = 400;
  private readonly boxHeight = 400;

  constructor(private resizeCallback: (name: string,
                                       x: number,
                                       y: number)=>void) {
    super();
    this.crossPosX = this.boxWidth / 2;
    this.crossPosY = this.boxHeight / 2;
    this.lengthPosX = this.boxWidth / 2;
    this.lengthPosY = this.boxHeight / 2;
    const imageUrl =
      "https://upload.wikimedia.org/wikipedia/commons/" +
      "9/91/Plan_of_HMS_Surprise.jpg";
    ImageLoader.get(imageUrl, (imageObj) => {
      this.width(imageObj.width);
      this.height(imageObj.height);

      this.image = new Konva.Image({
        x: 0,
        y: 0,
        image: imageObj,
        width: imageObj.width,
        height: imageObj.height,
      });
      this.add(this.image);
      resizeCallback("crossSection", this.crossPosX, this.crossPosY);
      resizeCallback("lengthSection", this.lengthPosX, this.lengthPosY);
      this.draw();
    });

    this.boxCrossSection = this.box(
      "crossSection",
      this.boxWidth,
      this.boxHeight,
      0,
      0,
    );
    this.boxLengthSection = this.box(
      "lengthSection",
      this.boxWidth,
      this.boxHeight,
      this.boxWidth + 10,
      0,
    );
    this.add(this.boxCrossSection);
    this.add(this.boxLengthSection);

    this.boxCrossSection.on("dragmove", this.moveBox.bind(this));
    this.boxLengthSection.on("dragmove", this.moveBox.bind(this));
  }

  public moveBox(event) {
    if(event.target.attrs.name === "crossSection") {
      this.crossPosX = event.target.attrs.x + (this.boxWidth / 2);
      this.crossPosY = event.target.attrs.y + (this.boxHeight / 2);
      this.resizeCallback("crossSection", this.crossPosX, this.crossPosY);
    } else {
      this.lengthPosX = event.target.attrs.x + (this.boxWidth / 2);
      this.lengthPosY = event.target.attrs.y + (this.boxHeight / 2);
      this.resizeCallback("lengthSection", this.lengthPosX, this.lengthPosY);
    }
  }

  public zoomIn() {
    this.width(this.width() * 1.02);
    this.height(this.height() * 1.02);
    this.image.scaleX(this.image.scaleX() * 1.02);
    this.image.scaleY(this.image.scaleY() * 1.02);
    this.resizeCallback("crossSection", this.crossPosX, this.crossPosY);
    this.resizeCallback("lengthSection", this.lengthPosX, this.lengthPosY);
    this.draw();
  }

  public zoomOut() {
    this.width(this.width() / 1.02);
    this.height(this.height() / 1.02);
    this.image.scaleX(this.image.scaleX() / 1.02);
    this.image.scaleY(this.image.scaleY() / 1.02);
    this.resizeCallback("crossSection", this.crossPosX, this.crossPosY);
    this.resizeCallback("lengthSection", this.lengthPosX, this.lengthPosY);
    this.draw();
  }

  public draw() {
    this.getLayer().clear();
    const returnVal = super.draw();
    this.boxCrossSection.moveToTop();
    this.boxLengthSection.moveToTop();
    return returnVal;
  }

  public viewCrossSection(value?: boolean) {
    if(value !== undefined) {
      this.boxCrossSection.visible(value);
      this.draw();
    }

    return this.boxCrossSection.visible();
  }

  public viewLengthSection(value?: boolean) {
    if(value !== undefined) {
      this.boxLengthSection.visible(value);
      this.draw();
    }

    return this.boxLengthSection.visible();
  }

  private box(
    name: string,
    width: number,
    height: number,
    startX: number,
    startY: number,
  ): Konva.Group {
    const returnVal = new Konva.Group({
      name,
      x: startX,
      y: startY,
      draggable: true,
    });

    returnVal.add(new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      stroke: "red",
      strokeWidth: 2,
      draggable: false,
    }));
    returnVal.add(new Konva.Line({
      points: [width / 2, 0, width / 2, height],
      stroke: "red",
      strokeWidth: 2,
      draggable: false,
    }));
    returnVal.add(new Konva.Line({
      points: [0, height / 2, width, height / 2],
      stroke: "blue",
      strokeWidth: 2,
      draggable: false,
    }));

    return returnVal;
  }
}

