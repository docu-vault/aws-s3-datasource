//import {  S3 } from "aws-sdk";
import { S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommandOutput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {StorageItem} from "@docu-vault/contracts" ;
import {StorageInterface} from "@docu-vault/contracts";
import 'reflect-metadata';

const {Logger} = require('@docu-vault/logger');
const logger = new Logger('StorageS3Repo: ');

import {Container, Inject, Service } from 'typedi';
var fs = require('fs');
const { pipeline } = require("stream");

const bucketName = process.env.S3_BUCKET_NAME ;
const defaultHttpStatusCode : number  = 200 ;

@Service({ transient: true })
export class S3Storage implements StorageInterface {
    
    private s3 : S3Client ;

    constructor(s3Client : S3Client) {
      if (!bucketName) {
        logger.error('S3_BUCKET_NAME is not defined');
        throw Error('S3_BUCKET_NAME is not defined');
      }
      this.s3 = s3Client;
    }
  
    async getSignedUrlForUpload (obj: StorageItem, contentType: string) 
    {
      logger.debug('getUploadUrl: passed vales are : ', obj);
      const bucketParams = {
        Bucket: bucketName,
        Key: obj.pathKey
      };
      // Create a command to put the object in the S3 bucket.
      const command = new PutObjectCommand(bucketParams);
      // Create the presigned URL.
      const url : string = await getSignedUrl(this.s3, command, 
        {expiresIn: obj.expiryInSeconds}
      );
      logger.debug(`signed url to upload ${obj.pathKey}  is : ${url}`);
      return url;
    }
    
    async getSignedUrlForDownload (obj: StorageItem) 
    {
      logger.debug('getUploadUrl: passed vales are : ', obj);
      const params =  { 
          Bucket: bucketName,
          Key: obj.pathKey
      };
      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(this.s3, command, { expiresIn: obj.expiryInSeconds }); 
      logger.debug(`signed url to download ${obj.pathKey}  is : ${url}`);
      return url;
    }

  /**
   * 
   * @param localFilename  : Local file name that is to be written to S3 object store.
   * @param destObjectname : S3 object name to write to.
   * An Amazon S3 bucket has no directory hierarchy such as you would find in a typical computer 
   * file system. You can, however, create a logical hierarchy by using object key names that 
   * imply a folder structure. For example, instead of naming an object sample.jpg, you can name 
   * it photos/2006/February/sample.jpg.
   */
  async fileToStorage ( localFilename: string, destObjectname: string) : Promise<boolean>
  {
    var returnStatus = true;
    var data : PutObjectCommandOutput;
    try {
        const fileStream = fs.createReadStream(localFilename);
        logger.debug(`filename: ${localFilename} , S3 obj full path: ${destObjectname}`);
        const uploadParams = {
            Bucket: bucketName,
            Key: destObjectname,
            Body: fileStream,
        };
        data = await this.s3.send(new PutObjectCommand(uploadParams));   
        logger.debug("AWS Write status code is: ", data.$metadata.httpStatusCode);
    } catch (err: any) {
        logger.debug("Error writing to S3: ", err);
        returnStatus=false;
        throw err;
    }
    return returnStatus ;
  }

  /**
   * 
   * @param objectName    : S3 Object to download 
   * @param localFilename : Name of the local file to which S3 object to saved to
   */
  async storageToFile ( objectName: string, localFilename: string) : Promise<boolean>
  {
    var returnStatus = true;
    const uploadParams = {
        Bucket: bucketName,
        Key: objectName,
    };

    try {
        var writeStream = fs.createWriteStream(localFilename);
        const data : GetObjectCommandOutput = await this.s3.send(new GetObjectCommand(uploadParams));
        const stream: ReadableStream<any> = data.Body!.transformToWebStream();
        pipeline(stream, writeStream, (err : any) => {
          err && console.error(err);
        });
    } catch (err: any) {
        logger.debug("Error", err);
        returnStatus = false;
        throw err;
    } finally {
    
    }
    return returnStatus;
  }

}