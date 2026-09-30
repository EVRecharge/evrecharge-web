import { Component, ElementRef, ViewChild, AfterViewChecked, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage } from '../../core/models/chat.model';

@Component({
  selector: 'evr-chat-widget',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.scss',
})
export class ChatWidget implements AfterViewChecked {
  private readonly chatService = inject(ChatService);

  @ViewChild('scrollArea') private scrollArea?: ElementRef<HTMLDivElement>;
  private shouldScroll = false;

  readonly open = signal(false);
  readonly loadingHistory = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly draft = signal('');
  private historyLoaded = false;

  toggle(): void {
    this.open.set(!this.open());
    if (this.open() && !this.historyLoaded) {
      this.loadHistory();
    }
  }

  private loadHistory(): void {
    this.loadingHistory.set(true);
    this.chatService.getHistory().subscribe({
      next: (messages) => {
        this.historyLoaded = true;
        this.messages.set(
          messages.length > 0
            ? messages
            : [{ role: 'assistant', content: "Hi! I'm the EVRecharge India assistant. Ask me anything about finding, booking, or paying for a charge." }],
        );
        this.loadingHistory.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.error.set('Could not load your conversation.');
        this.loadingHistory.set(false);
      },
    });
  }

  send(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) return;

    this.messages.set([...this.messages(), { role: 'user', content: text }]);
    this.draft.set('');
    this.sending.set(true);
    this.error.set(null);
    this.shouldScroll = true;

    this.chatService.sendMessage(text).subscribe({
      next: (reply) => {
        this.messages.set([...this.messages(), reply]);
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Could not reach the assistant. Please try again.');
        this.sending.set(false);
      },
    });
  }

  clear(): void {
    this.chatService.clearHistory().subscribe({
      next: () => {
        this.messages.set([]);
        this.historyLoaded = false;
        this.loadHistory();
      },
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }
}
