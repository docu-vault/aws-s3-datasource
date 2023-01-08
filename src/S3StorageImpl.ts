//import {  S3 } from "aws-sdk";
import {Container, Inject, Service } from 'typedi';
import 'reflect-metadata';
var fs = require('fs');
const { pipeline } = require("stream");

import { S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommandOutput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {StorageItem} from "@docu-vault/contracts" ;
import {Storage} from "@docu-vault/contracts";
const {Logger} = require('@docu-vault/logger');

const logger = new Logger('StorageS3Repo: ');

const GLOBAL_EXPIRY_IN_SECONDS : number = 60 ;

@Service({ transient: true })
export class S3Storage implements Storage 
{
    private s3 : S3Client ;
    private bucketName : string | undefined ; 
    private aws_region : string | undefined ;
    private global_expiry_in_seconds : number ;

    constructor() {
      this.bucketName = process.env.S3_BUCKET_NAME ;
      this.aws_region = process.env.AWS_REGION ;
      this.global_expiry_in_seconds =  Number(process.env.EXPIRY_IN_SECONDS) ;
      this.validateConfig();
      this.s3 = new S3Client({ region: this.aws_region });
    }
  
    async getSignedUrlForUpload (obj: StorageItem, contentType: string) : Promise<string>
    {
      logger.debug('getUploadUrl: passed vales are : ', obj);
      const bucketParams = {
        Bucket: this.bucketName,
        Key: obj.pathKey
      };
      // if not value mentioned at the request level, take it from global constant
      var expiryInSeconds = obj.expiryInSeconds ? obj.expiryInSeconds : this.global_expiry_in_seconds;
      logger.debug('expiryInSeconds set to: ', expiryInSeconds);
      // Create a command to put the object in the S3 bucket.
      const command = new PutObjectCommand(bucketParams);
      // Create the presigned URL.
      const url : string = await getSignedUrl(this.s3, command, 
        {expiresIn: expiryInSeconds}
      );
      logger.debug(`signed url to upload ${obj.pathKey}  is : ${url}`);
      return url;
    }
    
    async getSignedUrlForDownload (obj: StorageItem) : Promise<string>
    {
      logger.debug('getUploadUrl: passed vales are : ', obj);
      const params =  { 
          Bucket: this.bucketName,
          Key: obj.pathKey
      };
      // if not value mentioned at the request level, take it from global constant
      var expiryInSeconds = obj.expiryInSeconds ? obj.expiryInSeconds : this.global_expiry_in_seconds;
      logger.debug('expiryInSeconds set to: ', expiryInSeconds);
      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(this.s3, command, { expiresIn: expiryInSeconds }); 
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
            Bucket: this.bucketName,
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
        Bucket: this.bucketName,
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

  private validateConfig() {
    if (!this.bucketName) {
      logger.error('S3_BUCKET_NAME is not defined');
      throw Error('S3_BUCKET_NAME is not defined');
    };
    if (! this.aws_region) {
      logger.error('AWS_REGION is not defined');
      throw Error('AWS_REGION is not defined');
    };
  }

}