import { Injectable, BadRequestException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

interface GoogleProfile {
  id: string;
  emails?: Array<{ value: string; verified: boolean }>;
  name?: {
    givenName: string;
    familyName: string;
  };
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new BadRequestException('Email not provided by Google');
    }

    const user = await this.usersService.findOrCreateGoogleUser({
      id: profile.id,
      email: email,
      given_name: profile.name?.givenName,
      family_name: profile.name?.familyName,
      picture: profile.photos?.[0]?.value,
    });

    done(null, user);
  }
}
