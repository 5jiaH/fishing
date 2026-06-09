import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MYSQL_CONNECTION } from './database.constants';

const entityGlobs = (subdir: 'sqlite' | 'mysql') => [
  `src/entities/${subdir}/**/*.entity{.ts}`,
  `dist/entities/${subdir}/**/*.entity{.ts,.js}`,
];

export function sqliteTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'sqlite',
    database: join(process.cwd(), 'nest.sqlite'),
    synchronize: true,
    entities: entityGlobs('sqlite'),
  };
}

export function mysqlTypeOrmConfig(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    name: MYSQL_CONNECTION,
    type: 'mysql',
    host: config.getOrThrow<string>('MYSQL_HOST'),
    port: Number(config.get<string>('MYSQL_PORT', '3306')),
    username: config.getOrThrow<string>('MYSQL_USERNAME'),
    password: config.get<string>('MYSQL_PASSWORD', ''),
    database: config.getOrThrow<string>('MYSQL_DATABASE'),
    synchronize:
      config.get<string>('MYSQL_SYNCHRONIZE', 'true').toLowerCase() === 'true',
    entities: entityGlobs('mysql'),
  };
}
