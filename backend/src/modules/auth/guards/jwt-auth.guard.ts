import {Injectable, ExecutionContext, UnauthorizedException,} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Verificar si la ruta es pública
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // Await del resultado del guard padre
        const result = (await super.canActivate(context)) as boolean;

        // Si el guard padre devuelve un Observable, necesitamos convertirlo
        return result;
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException('No autorizado');
        }
        return user;
    }
}