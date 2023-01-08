import { Container} from 'typedi';
import {S3Storage}  from '../src/S3StorageImpl';

Container.set('storageRepository', new S3Storage());

export default Container ;

