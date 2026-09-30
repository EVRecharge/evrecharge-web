import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { Navbar } from './shared/navbar/navbar';
import { ChatWidget } from './shared/chat-widget/chat-widget';

@Component({
  imports: [RouterOutlet, Navbar, ChatWidget],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
}
