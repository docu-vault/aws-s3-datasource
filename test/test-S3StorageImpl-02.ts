import * as assert from "assert";
import {expect} from "chai";
import {fail} from "assert";
import 'reflect-metadata';
import { Container, Inject, Service } from 'typedi';

import {StorageItem} from "@docu-vault/contracts" ;
import {StorageInterface} from "@docu-vault/contracts";


const {Logger} = require('@docu-vault/logger');
const logger = new Logger('S3-tests');
const dataHandler = require('@docu-vault/api-handler');
var fs = require('fs');
const axios = require('axios');

const container = require('./app-init');

const testUpload1 : StorageItem = 
{
    pathKey: 'test01.pdf',
    expiryInSeconds: 30*60,
    contentType : "application/octet-stream"
}

const testDownload1 : StorageItem = 
{
    pathKey: '12349876/test01.pdf',
    expiryInSeconds: 30*60,
    contentType : "application/octet-stream"
}

const testUpload2 : StorageItem = 
{
    pathKey: '12349876/table-1.jpg',
    expiryInSeconds: 30*60,
    contentType : 'application/octet-stream'
}

const testUpload3 : StorageItem = 
{
    pathKey: '12349876/test-02.png',
    expiryInSeconds: 30*60,
    contentType : 'image/png'
}

const testDownloadNotExists : StorageItem = 
{
    pathKey: '12349876/test-10000.png',
    expiryInSeconds: 30*60,
    contentType : 'application/octet-stream'
}

const testUploadParentDoesNotExist : StorageItem = 
{
    pathKey: '12340000/test01.pdf',
    expiryInSeconds: 60*60,
    contentType : 'application/octet-stream'
}

const pdfOptions : any = {
    'Content-Type' : 'application/pdf'
}

const jpgOptions : any = {
    'Content-Type' : 'image/jpg'
}

const pngOptions : any = {
    'Content-Type' : 'image/png'
}

const bucketName : string = "dd-test-customer01-data";
const AWSRegion : string = "us-east-1";


const { S3Client, PutObjectCommand , GetObjectCommand} = require("@aws-sdk/client-s3");
const path = require("path");

/* utility function to upload directly to S3 */
const uploadUsingS3Client = async ( pathName: string, fileName: string) =>
{

    const fileStream = fs.createReadStream(fileName);
    const objName : string = pathName + "/" + path.basename(fileName);
    logger.debug(`pathName: ${pathName} , filename: ${fileName} , S3 obj full path: ${objName}`);

    // Set the parameters
    const uploadParams = {
        Bucket: bucketName,
        Key: objName,
        // Add the required 'Body' parameter
        Body: fileStream,
    };

    const s3 = new S3Client({ region: "us-east-1"});
    var data =null;
    try {
        data = await s3.send(new PutObjectCommand(uploadParams));    
    } catch (err: any) {
        logger.debug("Error", err);
        throw err;
    }
}

/* utility function to download directly */
const downloadUsingS3Client = async ( objName: string, outFileName: string) =>
{

    // Set the parameters
    const uploadParams = {
        Bucket: bucketName,
        Key: objName,
    };

    var data = null;
    var fd = null;
    const s3 = new S3Client({ region: "us-east-1"});
    try {
        data = await s3.send(new GetObjectCommand(uploadParams));
        fd = await data.Body;
        var stream = fs.createWriteStream(outFileName);
        await fd.pipe(stream);
    } catch (err: any) {
        logger.debug("Error", err);
        throw err;
    }

}

/*  upload file to S3 using signed url */
const upload = async (signedUrl: string, fileName: string, options: any) =>
{
    var handler = new dataHandler.APIHandler(signedUrl);
    const stats = fs.statSync(fileName);
    const len = stats.size;
    logger.debug('size is: ', len);

    const fileStream = fs.createReadStream(fileName);

    var data = null;
    try {
         const response = await axios({
                 url: signedUrl,
                 method: 'PUT',
                 data: fileStream,
                 headers : {'Content-Type' : "application/octet-stream",
                            'Content-Length' : len}
         });
         data = await response.data;
         return true;
    } catch (err: any)
    {
         logger.debug('upload using signedurl failed..', err);
         throw err;
    }
}


/* download file from s3 using signed url */
const download = async (signedUrl: string, fileName: string, options: any) =>
{

   var data = null;
   try {
        const response = await axios({
                url: signedUrl,
                method: 'GET',
                responseType: 'stream'
        });

        data = await response.data;

        var stream = fs.createWriteStream(fileName);
        data.pipe(stream);
        return true;
    
   } catch (err: any)
   {
        logger.debug('download using signedurl failed..', err);
        throw err;
   }
}


describe('AWS S3 Implemenaton of StorageInterface : ReadFromS3 Test Cases', () => {

    const s3Repo : StorageInterface= Container.get('storageRepository');
    
    it('Test2-001: fileToStorage: Write PDF File', async () => 
    {
      var status = await s3Repo.fileToStorage('test/data/test01.pdf', 'test/storageToFile/test02-01.pdf');
      expect(status).to.equal(true);
    });

    it('Test2-002: fileToStorage: Write JPG File', async () => 
    {
      var status = await s3Repo.fileToStorage('test/data/table-1.jpg', 'test/storageToFile/table-1-02.jpg');
      expect(status).to.equal(true);
    });

    it('Test2-003: fileToStorage: Write PNG File', async () => 
    {
      var status = await s3Repo.fileToStorage('test/data/test-02.png', 'test/storageToFile/test-02-02.png');
      expect(status).to.equal(true);
    });

    it('Test2-004: storageToFile: Write PDF File', async () => 
    {
      var status = await s3Repo.storageToFile('test/storageToFile/test02-01.pdf', 'test/download-02/test02-01.pdf', );
      expect(status).to.equal(true);
    });

    it('Test2-005: storageToFile: Write JPG File', async () => 
    {
      var status = await s3Repo.storageToFile('test/storageToFile/table-1-02.jpg', 'test/download-02/table-1-02.jpg');
      expect(status).to.equal(true);
    });

    it('Test2-006: storageToFile: invalid file name given', async () => 
    {
      var status: boolean;
      logger.debug('before the call');
      try {
        logger.debug('before the call-02');
        status = await s3Repo.storageToFile('test/storageToFile/table-1-02.jpg', 'test/download-invalid/table-1-02.jpg');
      } catch (err)
      {
        status = false;
        logger.debug('in catch flow');
      }
      logger.debug('after the call before expect');
      expect(status).to.equal(false);
    });

    
});
