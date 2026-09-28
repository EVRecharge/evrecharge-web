import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'evr-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cities = [
    'Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Hyderabad',
    'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh',
  ];

  constructor() {
    const session = this.auth.session();
    if (session) {
      this.router.navigateByUrl(session.role === 'USER' ? '/user/find-charging' : '/provider/profile');
    }
  }
}
