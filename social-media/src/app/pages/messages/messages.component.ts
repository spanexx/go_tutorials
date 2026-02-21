import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, Edit, Edit2, Phone, Video, Info, Plus, Smile, Send } from 'lucide-angular';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent {
  searchIcon = Search;
  editIcon = Edit;
  edit2Icon = Edit2;
  phoneIcon = Phone;
  videoIcon = Video;
  infoIcon = Info;
  plusIcon = Plus;
  smileIcon = Smile;
  sendIcon = Send;
}
