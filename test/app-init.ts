import { Container, Inject, Service } from 'typedi';
import { S3Client } from "@aws-sdk/client-s3";

//import {StorageInterface} from '../storage/core/repository/storage-repo';
import {S3Storage}  from '../src/S3StorageImpl';

const provider_key = process.env.STORAGE_PRODICER || 'AWS-S3';
const aws_signature_version = process.env.AWS_SIGNATURE_VERSION || 'v4' ;
const bucketName = process.env.S3_BUCKET_NAME ;
const aws_region = process.env.AWS_REGION ;


var s3Client = new S3Client({ region: aws_region });

Container.set('storageProvider', s3Client);
Container.set('storageRepository', new S3Storage(s3Client));

export default Container ;

