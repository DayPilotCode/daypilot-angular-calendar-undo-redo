import {Injectable} from '@angular/core';
import {DayPilot} from "@daypilot/daypilot-lite-angular";

@Injectable()
export class UndoService {

  private _items: any;

  private _history: HistoryRecord[] = [];

  get history(): HistoryRecord[] {
    return this._history;
  }

  private _position: number = 0;

  get position(): number {
    return this._position;
  }

  get canUndo(): boolean {
    return this._position > 0;
  }

  get canRedo(): boolean {
    return this._position < this._history.length;
  }

  initialize(items: Item[]): void {
    // deep copy using JSON serialization/deserialization
    this._items = [];
    items.forEach(i => {
      let str = JSON.stringify(i);
      let key = this.keyForItem(i);
      if (this._items[key]) {
        throw "Duplicate IDs are not allowed.";
      }
      this._items[key] = str;
    });

    this._history = [];
  }

  update(item: Item, text?: string): HistoryRecord {
    let key = this.keyForItem(item);
    let stringified = JSON.stringify(item);
    if (!this._items[key]) {
      throw "The item to be updated was not found in the list.";
    }
    if (this._items[key] === stringified) {
      throw "The item to be updated has not been modified.";
    }
    let record: HistoryRecord = {
      id: item.id,
      time: new DayPilot.Date(),
      previous: JSON.parse(this._items[key]),
      current: JSON.parse(stringified),
      text: text || "",
      type: "update"
    };

    this._items[key] = stringified;
    this.addToHistory(record);

    return record;
  }

  add(item: Item, text?: string): HistoryRecord {
    let key = this.keyForItem(item);
    if (this._items[key]) {
      throw "Item is already in the list";
    }
    let record: HistoryRecord = {
      id: item.id,
      time: new DayPilot.Date(),
      previous: null,
      current: item,
      text: text || "",
      type: "add"
    };

    this._items[key] = JSON.stringify(item);
    this.addToHistory(record);

    return record;
  }

  remove(item: Item, text?: string): HistoryRecord {
    let key = this.keyForItem(item);
    if (!this._items[key]) {
      throw "The item to be removed was not found in the list.";
    }
    if (this._items[key] !== JSON.stringify(item)) {
      throw "The item to be removed has been modified.";
    }
    let record: HistoryRecord = {
      id: item.id,
      time: new DayPilot.Date(),
      previous: item,
      current: null,
      text: text || "",
      type: "remove"
    };

    this._items[key] = null;
    this.addToHistory(record);

    return record;
  }

  undo(): HistoryRecord {
    if (!this.canUndo) {
      throw "Can't undo";
    }

    this._position -= 1;
    let record = this._history[this._position];

    let key = this.keyForId(record.id);
    switch (record.type) {
      case "add":
        this._items[key] = null;
        break;
      case "remove":
        this._items[key] = JSON.stringify(record.previous);
        break;
      case "update":
        this._items[key] = JSON.stringify(record.previous);
        break;
    }

    return record;
  }

  redo(): HistoryRecord {
    if (!this.canRedo) {
      throw "Can't redo";
    }

    let record = this._history[this._position];
    this._position += 1;

    let key = this.keyForId(record.id);
    switch (record.type) {
      case "add":
        this._items[key] = JSON.stringify(record.current);
        break;
      case "remove":
        this._items[key] = null;
        break;
      case "update":
        this._items[key] = JSON.stringify(record.current);
        break;
    }

    return record;
  }

  private keyForItem(item: Item): string {
    return this.keyForId(item.id);
  }

  private keyForId(id: string | number): string {
    return "_" + id;
  }

  private addToHistory(record: HistoryRecord): void {
    while (this.canRedo) {
      this._history.pop();
    }
    this._history.push(record);
    this._position += 1;
  }

}

export interface HistoryRecord {
  id: string | number;
  time: DayPilot.Date;
  previous: Item | null;
  current: Item | null;
  text: string;
  type: string;
}

export interface Item {
  id: string | number;
}
