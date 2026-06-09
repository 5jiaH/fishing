import { PassportSerializer } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private authService: AuthService) {
    super();
  }

  serializeUser(user: any, done: (e: any, id: any) => void) {
    done(null, user.id);
  }

  async deserializeUser(payload: number, done: (e: any, id?: any) => void) {
    const user = await this.authService.findUser({ id: payload, disabled: 0 }, [
      'id',
      'username',
      'role',
      'ip',
      'cover',
    ]);
    if (!user) done(new UnauthorizedException('Not authenticated'));
    done(null, user);
  }
}
