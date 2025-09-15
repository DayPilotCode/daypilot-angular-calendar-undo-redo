import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CalendarModule} from './calendar/calendar.module';

@Component({
  selector: 'app-root',
  imports: [CommonModule, CalendarModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
