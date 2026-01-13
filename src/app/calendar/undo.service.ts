import { Injectable, computed, signal } from "@angular/core";
import { DayPilot } from "@daypilot/daypilot-lite-angular";

@Injectable()
export class UndoService {

  private _items: Record<string, string | null> = {};

  readonly history = signal<HistoryRecord[]>([]);
  readonly position = signal<number>(0);

  readonly canUndo = computed(() => this.position() > 0);
  readonly canRedo = computed(() => this.position() < this.history().length);

  initialize(items: Item[]): void {
    // deep copy using JSON serialization/deserialization
    this._items = {};

    for (const i of items) {
      const str = JSON.stringify(i);
      const key = this.keyForItem(i);
      if (this._items[key]) {
        throw "Duplicate IDs are not allowed.";
      }
      this._items[key] = str;
    }

    this.history.set([]);
    this.position.set(0);
  }

  update(item: Item, text?: string): HistoryRecord {
    const key = this.keyForItem(item);
    const stringified = JSON.stringify(item);

    if (!this._items[key]) {
      throw "The item to be updated was not found in the list.";
    }
    if (this._items[key] === stringified) {
      throw "The item to be updated has not been modified.";
    }

    const record: HistoryRecord = {
      id: item.id,
      time: new DayPilot.Date(),
      previous: JSON.parse(this._items[key] as string),
      current: JSON.parse(stringified),
      text: text || "",
      type: "update",
    };

    this._items[key] = stringified;
    this.addToHistory(record);

    return record;
  }

  add(item: Item, text?: string): HistoryRecord {
    const key = this.keyForItem(item);

    if (this._items[key]) {
      throw "Item is already in the list";
    }

    const record: HistoryRecord = {
      id: item.id,
      time: new DayPilot.Date(),
      previous: null,
      current: item,
      text: text || "",
      type: "add",
    };

    this._items[key] = JSON.stringify(item);
    this.addToHistory(record);

    return record;
  }

  remove(item: Item, text?: string): HistoryRecord {
    const key = this.keyForItem(item);

    if (!this._items[key]) {
      throw "The item to be removed was not found in the list.";
    }
    if (this._items[key] !== JSON.stringify(item)) {
      throw "The item to be removed has been modified.";
    }

    const record: HistoryRecord = {
      id: item.id,
      time: new DayPilot.Date(),
      previous: item,
      current: null,
      text: text || "",
      type: "remove",
    };

    this._items[key] = null;
    this.addToHistory(record);

    return record;
  }

  undo(): HistoryRecord {
    if (!this.canUndo()) {
      throw "Can't undo";
    }

    const newPos = this.position() - 1;
    this.position.set(newPos);

    const record = this.history()[newPos];
    const key = this.keyForId(record.id);

    switch (record.type) {
      case "add":
        this._items[key] = null;
        break;
      case "remove":
      case "update":
        this._items[key] = JSON.stringify(record.previous);
        break;
    }

    return record;
  }

  redo(): HistoryRecord {
    if (!this.canRedo()) {
      throw "Can't redo";
    }

    const record = this.history()[this.position()];
    this.position.set(this.position() + 1);

    const key = this.keyForId(record.id);

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
    // drop redo tail first
    const pos = this.position();
    const base = this.history().slice(0, pos);

    const next = [...base, record];
    this.history.set(next);
    this.position.set(pos + 1);
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
