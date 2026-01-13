import {Component, ViewChild, AfterViewInit, signal} from "@angular/core";
import {DayPilot, DayPilotCalendarComponent} from "@daypilot/daypilot-lite-angular";
import {DataService} from "./data.service";
import {HistoryRecord, UndoService} from "./undo.service";
import EventData = DayPilot.EventData;

@Component({
  selector: 'calendar-component',
  standalone: false,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent implements AfterViewInit {

  @ViewChild("calendar")
  calendar!: DayPilotCalendarComponent;

  config = signal<DayPilot.CalendarConfig>({
    viewType: "Week",
    timeRangeSelectedHandling: "Enabled",
    businessBeginsHour: 9,
    businessEndsHour: 15,
    durationBarVisible: false,
    eventBorderRadius: 5,
    onTimeRangeSelected: async args => {
      const modal = await DayPilot.Modal.prompt("Create a new event:", "Event 1");
      const calendar = args.control;
      calendar.clearSelection();
      if (modal.canceled) {
        return;
      }
      const data = {
        start: args.start,
        end: args.end,
        id: DayPilot.guid(),
        resource: args.resource,
        text: modal.result
      };
      calendar.events.add(data);
      this.undoService.add(data, "Event created.");
    },

    onEventMoved: args => {
      this.undoService.update(args.e.data, "Event moved.");
    },
    onEventResized: args => {
      this.undoService.update(args.e.data, "Event resized.");
    },

    eventDeleteHandling: "Update",
    onEventDeleted: args => {
      this.undoService.remove(args.e.data, "Event deleted.");
    },
    onBeforeEventRender: args => {
      args.data.backColor  = "#f5c518aa";
      args.data.borderColor = "darker";
      args.data.fontColor   = "#111827";
    }

  });

  constructor(private ds: DataService, public undoService: UndoService) {
  }

  ngAfterViewInit(): void {
    const from = this.calendar.control.visibleStart();
    const to = this.calendar.control.visibleEnd();
    this.ds.getEvents(from, to).subscribe(events => {
      this.calendar.control.update({events});
      this.undoService.initialize(events);
    });
  }

  undoButtonClick(): void {
    let record: HistoryRecord = this.undoService.undo();

    switch (record.type) {
      case "add":
        // added, need to delete now
        this.calendar.control.events.remove(record.id);
        break;
      case "remove":
        // removed, need to add now
        this.calendar.control.events.add(<EventData>record.previous);
        break;
      case "update":
        // updated
        this.calendar.control.events.update(<EventData>record.previous);
        break;
    }
  }

  redoButtonClick(): void {
    const record: HistoryRecord = this.undoService.redo();

    switch (record.type) {
      case "add":
        // added, need to re-add
        this.calendar.control.events.add(<EventData>record.current);
        break;
      case "remove":
        // removed, need to remove again
        this.calendar.control.events.remove(record.id);
        break;
      case "update":
        // updated, use the new version
        this.calendar.control.events.update(<EventData>record.current);
        break;
    }
  }

}

