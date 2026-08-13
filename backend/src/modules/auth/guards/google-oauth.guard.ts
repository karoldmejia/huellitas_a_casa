import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const canActivate = await super.canActivate(context);
        if (canActivate) {
            const request = context.switchToHttp().getRequest();
            await super.logIn(request);
        }
        return true;
    }
}