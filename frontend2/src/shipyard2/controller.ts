// Copyright 2017 duncan law (mrdunk@gmail.com)

import {
  EventBase,
  EventLineDelete,
  EventLineHighlight,
  EventLineMirror,
  EventLineModify,
  EventLineSelect,
  EventUiInputElement,
  EventUiMouseDrag,
  EventUiMouseMove,
  LineEnd} from "./events";
import {ModelBase} from "./model";
import {ViewBase} from "./view";

const storageName = "shipYardCommandBuffers";

interface ICommand {
  events?: EventBase[];
  backgroundImageEvents?: IBackgroundImageEvent[];
}

export interface Ixy {
  x: number;
  y: number;
}

export interface IBackgroundImage {
  widgetType: string;
  finishVisible?: boolean;
  finishImage?: string;
  finishPos?: Ixy;
}

export interface IBackgroundImageEvent extends IBackgroundImage {
  sequence: string;
  startVisible?: boolean;
  startImage?: string;
  startPos?: Ixy;
}

export interface IPoint {
  x: number;  // Port/Starboard axis.
  y: number;  // Up/Down axis.
  z: number;  // Fore/Aft axis.
}

export interface ILinePos {
  a: IPoint;
  b: IPoint;
}

export interface ILine {
  id: string;
  finishPos: ILinePos;
  highlight?: boolean;
  mirrored?: boolean;
  selected?: boolean;
}

export interface ILineEvent extends ILine {
  sequence: string;         // Unique id for series of related commands.
  widgetType?: string;      // Command originating widget type.
  startPos?: ILinePos;      // Position before command executed.
  toggleMirrored?: boolean; // Change mirroring status.
  selecting?: boolean;      // Change selected status.
}

export function comparePoint(p1: IPoint, p2: IPoint): boolean {
  return (p1.x === p2.x && p1.y === p2.y && p1.z === p2.z);
}

export function subtractPoint(p1: IPoint, p2: IPoint): IPoint {
  return {x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z};
}

export function compareLinePos(lp1: ILinePos, lp2: ILinePos): boolean {
  if(lp1 === null || lp2 === null) {
    return (lp1 === lp2);
  }
  return (comparePoint(lp1.a, lp2.a) && comparePoint(lp1.b, lp2.b));
}

// An inexpensive approximation of the distance between 2 lines on the X,Y plane
export function approxDistLinePos(lp1: ILinePos, lp2: ILinePos): number {
  return Math.abs(lp1.a.x - lp2.a.x) + Math.abs(lp1.a.y - lp2.a.y) +
    Math.abs(lp1.b.x - lp2.b.x) + Math.abs(lp1.b.y - lp2.b.y);
}

export function compareLineEvent(e1: ILineEvent, e2: ILineEvent): boolean {
  return (
    e1.id === e2.id &&
    compareLinePos(e1.startPos, e2.startPos) &&
    compareLinePos(e1.finishPos, e2.finishPos)
  );
}

export abstract class ControllerBase {
  protected commands: ICommand[];
  protected views: ViewBase[];
  protected model: ModelBase;
  protected logger;
  constructor(model: ModelBase, views: ViewBase[], logger?) {
    this.model = model;  // TODO Can this be assigned automatically?
    this.views = views;
    this.logger = logger || console;

    if(this.model) {
      this.model.init(this);
    }

    this.views.forEach((view) => {
      view.init(this);
    });
  }

  public onEvent(event: EventBase) {
    console.error("Undefined method");
  }
    /*public onLineEvent(
    lineEvent: ILineEvent,
    backgroundImageEvent?: IBackgroundImageEvent): void {
    console.error("Undefined method");
  }*/
  public onBackgroundImageEvent(event: IBackgroundImageEvent) {/**/}
  public updateViews(line: ILine): void {/**/}
  public updateViewsBackgroundImage(backgroundImage: IBackgroundImage): void {
    /**/
  }
  public onButtonEvent(event: EventUiInputElement) {
    console.error("Unimplemented method");
  }
  public getLine(lineId: string): ILine {
    return this.model.getLine(lineId);
  }
  public getFilenames(): string[] { return []; }
}

export class Controller extends ControllerBase {
  protected commands: ICommand[];
  protected views: ViewBase[];
  protected model: ModelBase;
  protected logger;
  private sequence: string = "";
  private sequenceCounter: number = 0;
  private commandPointer: number;
  private buttonStates = {
    selectLine: {
      value: false,
      clear: ["modifyLine", "backgroundImage", "fileOps"],
      preventUnClick: true},
    modifyLine: {
      value: true,
      clear: ["selectLine", "backgroundImage", "fileOps"],
      preventUnClick: true},
    backgroundImage: {
      value: false,
      clear: ["modifyLine", "selectLine", "fileOps"],
      preventUnClick: true},
    allLayers: {value: false, clear: ["fileOps"]},
    selected_rib: {clear: ["fileOps"]},
    clearSelectCursor: {value: false, clear: ["fileOps"]},
    fileOps: {value: 0},
    fileOpsSave: {},
    fileOpsLoad: {},
    fileOpsDelete: {},
    fileOpsNew: {},
    backgroundImageShowCross: {},
    backgroundImageShowLength: {},
    backgroundImageUrlCross: {},
    backgroundImageUrlLength: {},
  };

  constructor(model: ModelBase, views: ViewBase[], logger?) {
    super(model, views, logger);
    this.commands = [];
    this.commandPointer = 0;
    this.onStartupCommands();

    this.setButtonStates();
  }

  public onEvent(event: EventBase) {
    switch(true) {
      case event.constructor.name === "EventUiInputElement":
        this.onButtonEvent(event as EventUiInputElement);
        break;

      case event.constructor.name === "EventUiSelectRib":
        this.updateButton("selected_rib", event.z);
        break;

      case event.constructor.name === "EventUiMouseDrag" &&
           Boolean(this.buttonStates.modifyLine.value):
        this.onUiMouseDragModifyLine(event as EventUiMouseDrag);
        break;
      case event.constructor.name === "EventUiMouseDrag" &&
           Boolean(this.buttonStates.selectLine.value):
        this.onUiMouseDragSelect(event as EventUiMouseDrag);
        break;
      case event.constructor.name === "EventUiMouseDrag" &&
           Boolean(this.buttonStates.backgroundImage.value):
        console.log("TODO: EventUiMouseDrag backgroundImage");
        break;

      case event.constructor.name === "EventUiMouseMove" &&
           Boolean(this.buttonStates.modifyLine.value):
        this.onUiMouseMove(event as EventUiMouseMove);
        break;
      case event.constructor.name === "EventUiMouseMove" &&
           Boolean(this.buttonStates.selectLine.value):
        this.onUiMouseMove(event as EventUiMouseMove);
        break;
      case event.constructor.name === "EventUiMouseMove" &&
           Boolean(this.buttonStates.backgroundImage.value):
        console.log("TODO: EventUiMouseMove backgroundImage");
        break;

      default:
        console.log("Unknown event:", event);
    }
  }

  // TODO Protected?
  public onButtonEvent(event: EventUiInputElement) {
    // this.logger.log(event);
    let value: any = event.valueText;
    if(value === undefined) {
      value = event.valueBool;
    }
    value = this.updateButton(event.label, value);

    switch (event.label) {
      case "undo":
        this.undoCommand();
        break;
      case "redo":
        this.redoCommand();
        break;
      case "delete":
        this.deleteSelectedLines();
        break;
      case "mirror":
        this.mirrorSelectedLines();
        break;
      case "allLayers":
        break;
      case "backgroundImage":
        break;
      case "backgroundImageShowCross":
        break;
      case "backgroundImageShowLength":
        break;
      case "backgroundImageUrlCross":
        break;
      case "backgroundImageUrlLength":
        break;
      case "fileOps":
        break;
      case "fileOpsSave":
        this.saveCommands(value);
        this.updateButton(event.label, value);
        break;
      case "fileOpsLoad":
        this.loadCommands(value);
        break;
      case "fileOpsDelete":
        this.deleteCommands(value);
        this.updateButton(event.label, value);
        break;
      case "fileOpsNew":
        this.newCommands();
        break;
      case "clearSelectCursor":
        break;
      default:
        this.logger.warn("Invalid buttonLabel:", event.label);
        return;
    }
  }

  public onBackgroundImageEvent(event: IBackgroundImageEvent) {
    this.newSequence();
    const command: ICommand = {
      backgroundImageEvents: [],
    };

    command.backgroundImageEvents.push(event);
    this.recordCommand(command);
    this.performCommand(null, command);
  }

  public updateButton(buttonLabel: string, value: any) {
    if(this.buttonStates[buttonLabel] === undefined) {
      // Just a simple non-toggling push button.
      return value;
    }

    if(this.buttonStates[buttonLabel].preventUnClick &&
        this.buttonStates[buttonLabel].value) {
      return value;
    }

    if(value === undefined) {
      // No value passed in.
      const input = document.getElementsByClassName(buttonLabel)[0];
      if(input) {
        console.log(input.tagName.toLowerCase());
        if(input.tagName.toLowerCase() === "input") {
          value = (input as HTMLInputElement).value;
        } else if(input.tagName.toLowerCase() === "select") {
          const i = (input as HTMLSelectElement);
          if(i.selectedIndex >= 0) {
            value = i.options[i.selectedIndex].value;
          }
        }
      }
    }
    if(value === undefined &&
       this.buttonStates[buttonLabel].value !== undefined) {
      // No value passed in and no associated HTML input field.
      value = Number(!this.buttonStates[buttonLabel].value);
      this.buttonStates[buttonLabel].value = value;
    }
    if(value === undefined) {
      // No default button value defined either.
      return value;
    }
    this.views.forEach((view) => {
      view.setButtonValue(buttonLabel, value);
      if(this.buttonStates[buttonLabel].clear !== undefined) {
        this.buttonStates[buttonLabel].clear.forEach((otherButtonLabel) => {
          this.buttonStates[otherButtonLabel].value = false;
          view.setButtonValue(otherButtonLabel, Number(false));
        });
      }
    });

    return value;
  }

  // Called by Model.
  public updateViews(line: ILine) {
    this.views.forEach((view) => {
      view.updateLine(line);
    });
  }

  public updateViewsBackgroundImage(backgroundImage: IBackgroundImage): void {
    this.views.forEach((view) => {
      // TODO Send this through updateButton(...) so it updated menu.
      view.setBackgroundImage(backgroundImage);
    });
  }

  public getFilenames(): string[] {
    let allCommandBuffers = JSON.parse(localStorage.getItem(storageName));
    if(allCommandBuffers === null || allCommandBuffers === undefined) {
      allCommandBuffers = {};
    }
    return Object.keys(allCommandBuffers);
  }

  // Make endpoints move towards nearby endpoint if it is close enough.
  // line is modified in place.
  protected snap(line: ILine): void {
    const snapDistance = 10;

    // Look line up from the Model to discover it should be mirrored or not.
    const lookup = this.getLine(line.id);
    let mirrored;
    let nearest;
    if(lookup) {
      // Found line in Model.
      nearest = this.model.nearestLine(lookup);
      mirrored = lookup.mirrored;
    } else {
      // Didn't find line in Model. Probably a new line.
      nearest = this.model.nearestLine(line);
    }

    if(lookup && lookup.mirrored) {
      // Make mirrored lines meet if they come close to the centre.
      if(Math.abs(line.finishPos.a.x) < snapDistance) {
        line.finishPos.a.x = 0;
      }
      if(Math.abs(line.finishPos.b.x) < snapDistance) {
        line.finishPos.b.x = 0;
      }
    }

    const nearestPoint = nearest.point;
    if(!nearestPoint) {
      // No other line with a matching z coordinate.
      return;
    }
    mirrored = mirrored || nearest.mirrored;

    const matches = [];
    matches.push([
      Math.abs(nearestPoint.x - line.finishPos.a.x) +
      Math.abs(nearestPoint.y - line.finishPos.a.y),
      line.finishPos.a,
    ]);
    matches.push([
      Math.abs(nearestPoint.x - line.finishPos.b.x) +
      Math.abs(nearestPoint.y - line.finishPos.b.y),
      line.finishPos.b,
    ]);
    if(mirrored) {
      matches.push([
        Math.abs(nearestPoint.x + line.finishPos.a.x) +
        Math.abs(nearestPoint.y - line.finishPos.a.y),
        line.finishPos.a,
      ]);
      matches.push([
        Math.abs(nearestPoint.x + line.finishPos.b.x) +
        Math.abs(nearestPoint.y - line.finishPos.b.y),
        line.finishPos.b,
      ]);
    }

    let closestDist = 99999999;
    let closest;
    matches.forEach((match, index) => {
      if(match[0] < closestDist) {
        closestDist = match[0];
        closest = index;
      }
    });

    const pointReference = matches[closest][1];
    if(closestDist < snapDistance) {
      pointReference.x = nearestPoint.x;
      pointReference.y = nearestPoint.y;
      pointReference.z = nearestPoint.z;
      if(closest >= 2) {
        // One of the mirrored points.
        pointReference.x = -matches[closest][1].x;
      }
    }
  }

  protected onStartupCommands() {
    const data = localStorage.getItem("shipYardCommandBufferStartup");
    // window.alert(data);
    if(data) {
      this.commands = JSON.parse(data);
    }
    this.commandPointer = 0;
    if(this.commands === undefined || this.commands === null) {
      this.commands = [];
    }
    while(this.commandPointer < this.commands.length) {
      this.redoCommand();
    }
  }

  private onUiMouseDragModifyLine(event: EventUiMouseDrag) {
    if(!event.lineId && !event.startPoint && !event.finishPoint) {
      this.logger.warn(
        "No lineId, startPoint or finishPoint for line: ", event.lineId);
      return;
    }

    if(event.lineId && !event.startPoint && !event.finishPoint) {
      this.logger.warn(
        "No startPoint, finishPoint or options for line: ", event.lineId);
      return;
    }

    if(event.lineId &&
       (event.lineEnd === undefined || event.lineEnd === null)) {
      this.logger.warn(
        "Modified end not specified on line: ", event.lineId);
      return;
    }

    if(!event.lineId) {
      if(!event.sequence.startsWith("sequence_")) {
        // TODO UnitTest for this case.
        this.logger.warn("No lineId or sequence specified.");
        return;
      }
      event.lineId = "drawnLine_" + event.sequence.slice(9);
      event.lineEnd = LineEnd.B1;
      console.log("New line!!", event.lineId, event.lineEnd);
    }

    // this.snap(event);  // TODO Fix snap().

    const command: ICommand = {};
    command.events = [new EventLineModify(event)];
    this.recordCommand(command);
    this.performCommand(null, command);
  }

  private onUiMouseDragSelect(event: EventUiMouseDrag) {
    if(!event.lineId) {
      this.logger.warn("No lineId when selecting line");
      return;
    }
    const selectEvent = new EventLineSelect({
      widgetType: event.widgetType,
      lineId: event.lineId,
    });
    const command: ICommand = {};
    command.events = [selectEvent];
    this.recordCommand(command);
    this.performCommand(null, command);
  }

  private onUiMouseMove(event: EventUiMouseMove) {
    const highlightEvent = new EventLineHighlight({
      widgetType: event.widgetType,
      lineId: event.lineId,
    });
    const command: ICommand = {};
    command.events = [highlightEvent];
    this.recordCommand(command);
    this.performCommand(null, command);
  }

  /*public onLineEvent(lineEvent: ILineEvent,
                     backgroundImageEvent?: IBackgroundImageEvent) {
    if(!lineEvent.id && !lineEvent.startPos && !lineEvent.finishPos) {
      this.logger.warn("No id, startPos or finishPos for line: ", lineEvent.id);
      return;
    }

    if(lineEvent.id && !lineEvent.startPos && !lineEvent.finishPos &&
         lineEvent.highlight === undefined) {
      this.logger.warn("No startPos, finishPos or options for line: ",
                       lineEvent.id);
      return;
    }

    if(lineEvent.startPos &&
       (!lineEvent.startPos.a || !lineEvent.startPos.b)) {
      this.logger.warn(
        "Missing endpoint for startPos of line: ", lineEvent.id);
      return;
    }
    if(lineEvent.finishPos &&
       (!lineEvent.finishPos.a || !lineEvent.finishPos.b)) {
      this.logger.warn(
        "Missing endpoint for endPos of line: ", lineEvent.id);
      return;
    }

    if(!lineEvent.id) {
      if(lineEvent.startPos) {
        this.logger.warn(
          "No id specified for line being moved or deleted.");
        return;
      }
      // No id and no lineEvent.startPos implies this is a new line.
      if(!lineEvent.sequence.startsWith("sequence_")) {
        // TODO UnitTest for this case.
        this.logger.warn("No id or sequence specified.");
        return;
      }
      lineEvent.id = "drawnLine_" + lineEvent.sequence.slice(9);
    }

    if(this.buttonStates.selectLine.value &&
       lineEvent.id && lineEvent.startPos &&
       approxDistLinePos(lineEvent.startPos, lineEvent.finishPos) < 10) {
      // Line has been clicked on. Toggle select state.
      lineEvent.selecting = true;
      lineEvent.startPos = null;
      lineEvent.finishPos = null;
    } else if(lineEvent.selected) {
      lineEvent.selecting = true;
      lineEvent.startPos = null;
      lineEvent.finishPos = null;
    } else if(this.buttonStates.selectLine.value &&
              lineEvent.startPos &&
              lineEvent.id) {
      console.log("TODO: drag selected lines", lineEvent);
      return;
    } else if(this.buttonStates.selectLine.value && lineEvent.finishPos) {
      // Box to select lines.
      this.model.deSelectAll();
      this.views.forEach((view) => {
        view.drawSelectCursor(lineEvent.finishPos.a, lineEvent.finishPos.b);
      });
      return;
    } else if(this.buttonStates.backgroundImage.value) {
      console.assert(Boolean(backgroundImageEvent));
    } else {
      if(lineEvent.finishPos) {
        // Ensure both endpoints are in the same plane.
        lineEvent.finishPos.b.z = lineEvent.finishPos.a.z;

        this.snap(lineEvent);
      }
    }

    const command: ICommand = {};
    if(this.buttonStates.modifyLine.value) {
      command.lineEvents = [lineEvent];
    } else if(this.buttonStates.backgroundImage.value && backgroundImageEvent) {
      command.backgroundImageEvents = [backgroundImageEvent];
    }
    this.recordCommand(command);
    this.performCommand(null, command);
  }*/

  private setButtonStates() {
    this.views.forEach((view) => {
      // Set whether the "back" and "forward" buttons are selectable.
      view.setButtonState("undo", this.commandPointer > 0);
      view.setButtonState("redo", this.commandPointer < this.commands.length);

      for(const key in this.buttonStates) {
        if (this.buttonStates.hasOwnProperty(key) &&
            this.buttonStates[key].value !== undefined) {
          view.setButtonValue(key, this.buttonStates[key].value);
        }
      }
    });
  }

  private commandsMatchingSequence(
      command1: ICommand, command2: ICommand): boolean {
    if(command1 === undefined || command2 === undefined) {
      return false;
    }
    let returnVal = false;
    const events1: any = command1.events || command1.backgroundImageEvents;
    const events2: any = command2.events || command2.backgroundImageEvents;
    events1.forEach((event1) => {
      events2.forEach((event2) => {
        if(event1.sequence === event2.sequence) {
          returnVal = true;
        }
      });
    });
    return returnVal;
  }

  private loggableCommand(command: ICommand): boolean {
    let returnVal = false;
    if(command.events) {
      command.events.forEach((lineEvent) => {
        /*if(lineEvent.selecting) {
          returnVal = returnVal ||
            (Boolean(lineEvent.startPos) && !lineEvent.id);
        } else {
          returnVal = returnVal ||
            Boolean(lineEvent.startPos) ||
            Boolean(lineEvent.finishPos) ||
            lineEvent.toggleMirrored !== undefined;
        }*/
        returnVal = returnVal ||
                    event.constructor.name in ["EventLineModify"];
      });
    }
    if(command.backgroundImageEvents) {
      command.backgroundImageEvents.forEach((event) => {
        returnVal = true;
      });
    }
    return returnVal;
  }

  private recordCommand(command: ICommand) {
    if(!this.loggableCommand(command)) {
      return;
    }

    if(!this.commandsMatchingSequence(
        this.commands[this.commandPointer -1], command)) {
      this.commandPointer++;
    }

    this.commands = this.commands.slice(0, this.commandPointer -1);
    this.commands.push(command);
    this.persistCommands();
  }

  private performCommand(commandIndex?: number, command?: ICommand) {
    if(commandIndex === undefined) {
      commandIndex = this.commandPointer;
    }

    if(command === undefined) {
      command = this.commands[commandIndex];
    }

    console.log(commandIndex, command);

    if(command.events) {
      command.events.forEach((event) => {
        switch(event.constructor.name) {
          case "EventLineModify":
            this.views.forEach((view) => {
              view.syncSequence((event as EventLineModify).lineId);
            });
            this.model.onLineEvent(event);
            break;
          case "EventLineSelect":
          case "EventLineHighlight":
          case "EventLineMirror":
          case "EventLineDelete":
            this.model.onLineEvent(event);
            break;
          default:
            console.log("Unknown command event:", event);
        }
      });
    }
    if(command.backgroundImageEvents) {
      command.backgroundImageEvents.forEach((event) => {
        this.model.onBackgroundImageEvent(event);
      });
    }

    this.setButtonStates();
  }

  private undoCommand(commandIndex?: number) {
    this.commandPointer--;

    if(commandIndex === undefined) {
      commandIndex = this.commandPointer;
    }

    if(commandIndex >= this.commands.length || commandIndex < 0) {
      this.logger.warn("Trying to undoCommand past end of buffer. index:",
                       commandIndex);
      this.commandPointer = 0;
      return;
    }

    const command = this.commands[commandIndex];
    if(command.events) {
      command.events.forEach((event) => {
        console.log(event);
        if(event.constructor.name === "EventUiMouseDrag") {
          const lineEvent: EventUiMouseDrag = event as EventUiMouseDrag;
          const reverseLineEvent: EventUiMouseDrag = {
            widgetType: lineEvent.widgetType,
            sequence: lineEvent.sequence,
            lineId: lineEvent.lineId,
            startPoint: JSON.parse(JSON.stringify(lineEvent.finishPoint)),
            finishPoint: JSON.parse(JSON.stringify(lineEvent.startPoint)),
            // toggleMirrored: event.toggleMirrored,
            // TODO Make test for interaction between undo and mirrored.
            // mirrored: event.mirrored,
          };
          this.model.onLineEvent(reverseLineEvent);
        }
      });
    }
    if(command.backgroundImageEvents) {
      command.backgroundImageEvents.forEach((event) => {
        const reverseBackgroundImageEvent = JSON.parse(JSON.stringify(event));
        reverseBackgroundImageEvent.startVisible = event.finishVisible;
        reverseBackgroundImageEvent.finishVisible = event.startVisible;
        reverseBackgroundImageEvent.startImage = event.finishImage;
        reverseBackgroundImageEvent.finishImage = event.startImage;
        this.model.onBackgroundImageEvent(reverseBackgroundImageEvent);
      });
    }
    this.setButtonStates();
  }

  private redoCommand(commandIndex?: number) {
    if(commandIndex === undefined) {
      commandIndex = this.commandPointer;
    }
    if(commandIndex >= this.commands.length || commandIndex < 0) {
      this.logger.warn("Trying to performCommand past end of buffer. index:",
        commandIndex);
      return;
    }

    this.performCommand();
    this.commandPointer++;
    this.setButtonStates();
  }

  // Generate a unique id for a series of related events.
  private newSequence(): string {
    this.sequenceCounter++;
    this.sequence =
      "sequence_controller_" + this.sequenceCounter;
    return this.sequence;
  }

  private deleteSelectedLines() {
    this.newSequence();
    const command: ICommand = {
      events: [],
    };

    const selectedLines = this.model.getSelectedLines();
    for(const lineId in selectedLines) {
      if(selectedLines.hasOwnProperty(lineId)) {
        const line = this.model.getLine(lineId);
        const event = new EventLineDelete({
          widgetType: "TODO",
          lineId,
        });
        command.events.push(event);
      }
    }

    this.recordCommand(command);
    this.performCommand(null, command);
  }

  private mirrorSelectedLines() {
    this.newSequence();
    const command: ICommand = {
      events: [],
    };

    const selectedLines = this.model.getSelectedLines();
    for(const lineId in selectedLines) {
      if(selectedLines.hasOwnProperty(lineId)) {
        const line = this.model.getLine(lineId);
        const event = new EventLineMirror({
          widgetType: "TODO",
          lineId,
        });
        command.events.push(event);
      }
    }

    this.recordCommand(command);
    this.performCommand(null, command);
  }

  private saveCommands(filename: string) {
    let allCommandBuffers = JSON.parse(localStorage.getItem(storageName));
    if(allCommandBuffers === null || allCommandBuffers === undefined) {
      allCommandBuffers = {};
    }
    allCommandBuffers[filename] = this.commands;
    localStorage.setItem(storageName, JSON.stringify(allCommandBuffers));
    console.log(allCommandBuffers);
  }

  private deleteCommands(filename: string) {
    let allCommandBuffers = JSON.parse(localStorage.getItem(storageName));
    if(allCommandBuffers === null || allCommandBuffers === undefined) {
      allCommandBuffers = {};
    }
    allCommandBuffers[filename] = undefined;
    localStorage.setItem(storageName, JSON.stringify(allCommandBuffers));
  }

  private loadCommands(filename: string) {
    const allCommandBuffers = JSON.parse(localStorage.getItem(storageName));
    let data = allCommandBuffers[filename];
    if(data === null || data === undefined) {
      data = [];
    }
    data = JSON.stringify(data);
    // console.log(data);
    localStorage.setItem("shipYardCommandBufferStartup", data);
    location.reload();
  }

  private newCommands() {
    this.commands = [];
    this.persistCommands();
    location.reload();
  }

  private persistCommands() {
    const data = JSON.stringify(this.commands);
    localStorage.setItem("shipYardCommandBufferStartup", data);
  }
}

// Controller with relaxed permissions for testing.
export class TestController extends Controller {
  public commands: ICommand[];

  public snap(line: ILine): void {
    super.snap(line);
  }

  protected onStartupCommands() {
    // Pass
  }
}

export class MockController extends ControllerBase {
  public commands;
  public getLineReturnValue: ILine;

  constructor(model: ModelBase, views: ViewBase[], logger?) {
    super(model, views, logger);
    this.commands = [];
  }

  public onLineEvent(lineEvent: ILineEvent): void {
    this.commands.push(lineEvent);
  }

  public getLine(lineId: string): ILine {
    return this.getLineReturnValue;
  }
}
