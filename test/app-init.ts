import { Container} from 'typedi';
import {S3Storage}  from '../src/S3StorageImpl';

var ctx : Map<string, any> = new Map();
Container.set('storageRepository', new S3Storage(ctx));

export default Container ;

