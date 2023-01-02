import * as assert from "assert";
import {expect} from "chai";
import {fail} from "assert";
import {StorageItem} from '../src-ts/storage/core/models/storage';

import 'reflect-metadata';
import { Container, Inject, Service } from 'typedi';

//const container = require('./../src-ts/utils/app-config');
const container = require('./../src-ts/utils/app-init');
//import {StorageS3Repo}  from '../src-ts/storage/datasources/storage-s3';
import {StorageService} from  '../src-ts/storage/core/services/storage-services'

const {Logger} = require('@docudata/logger');
const logger = new Logger('S3-tests');
const dataHandler = require('@docudata/api-handler');
var fs = require('fs');
const axios = require('axios');

const testUpload1 : any = 
{
    key: 'test01.pdf',
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


describe('S3 Test Cases', () => {

    //const serv = Container.get("storageService");
    //@Inject("storageService")
    const ss : StorageService = Container.get(StorageService);
    // Container.get("storageService");
    
    it('getUploadURL: updateload test01.pdf', async () => 
    {
      const signedUrl = await ss.getUploadSignedUrl(testUpload1);
      expect(signedUrl).not.equals(null);
      var status = await upload(signedUrl, 'test/data/test01.pdf', pdfOptions);
      expect(status).to.equal(true);
    });


});
