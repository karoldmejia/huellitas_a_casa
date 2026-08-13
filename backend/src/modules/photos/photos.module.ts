import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PhotosService } from './photos.service';

@Module({
    imports: [ConfigModule],
    providers: [PhotosService],
    exports: [PhotosService],
})
export class PhotosModule { }