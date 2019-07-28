import { Component, OnInit } from '@angular/core';
import { ItemsHeaderInterface, SharedService } from '../../../services/shared.service';
import { AppConfig } from 'src/app/config/app.config';

@Component({
  selector: 'app-sidebar-auth',
  templateUrl: './sidebar-auth.component.html',
  styleUrls: ['./sidebar-auth.component.css']
})
export class SidebarAuthComponent implements OnInit {

  itemsHeader: ItemsHeaderInterface;
  keyObject = Object.keys;

  constructor(
    private sharedService: SharedService
  ) { }

  ngOnInit() {
    this.itemsHeader = {
      home: this.sharedService.buildHeader('default', 'Home', '', '', false, `/${AppConfig.routes.home}`, true, {}, false),
      auth: this.sharedService.buildHeader('default', 'Sign In', '', '', false, `/${AppConfig.routes.auth}`, true, {}, false)
    }
  }
}
