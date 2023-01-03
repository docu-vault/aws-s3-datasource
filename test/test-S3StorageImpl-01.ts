import * as assert from "assert";
import {expect} from "chai";
import {fail} from "assert";
import 'reflect-metadata';
import { Container, Inject, Service } from 'typedi';

import {StorageItem} from "@docu-vault/contracts" ;
import {Storage} from "@docu-vault/contracts";


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


describe('AWS S3 Implemenaton of StorageInterface : Test Cases', () => {

    const s3Repo : Storage= Container.get('storageRepository');
    
    it('Test-001: getUploadURL: PDF file test01.pdf', async () => 
    {
      const cType : string  = testUpload1.contentType ? testUpload1.contentType : "application/octet-stream";

      const signedUrl = await s3Repo.getSignedUrlForUpload(testUpload1, cType);
      expect(signedUrl).not.equals(null);
      var status = await upload(signedUrl, 'test/data/test01.pdf', pdfOptions);
      expect(status).to.equal(true);
    });

    
    it('Test-002: getUploadURL: JPG file table-1.jpg', async () => 
    {
      
      const cType = testUpload2.contentType ? testUpload2.contentType : "";
      const signedUrl = await s3Repo.getSignedUrlForUpload(testUpload2, cType);
      expect(signedUrl).not.equals(null);
      var status = await upload(signedUrl, 'test/data/table-1.jpg', jpgOptions);
      expect(status).to.equal(true);
    });


    it('Test-003: getUploadURL: PNG file test-02.png', async () => 
    {
      const cType = testUpload3.contentType ? testUpload3.contentType : "";
      const signedUrl = await s3Repo.getSignedUrlForUpload(testUpload3, cType);
      expect(signedUrl).not.equals(null);
      var status = await upload(signedUrl, 'test/data/test-02.png', pngOptions);
      expect(status).to.equal(true);
    });

    

    it('Test-004: getDownloadURL: download PDF file test01.pdf ', async () =>
    {
        const cType : string  = testUpload1.contentType ? testUpload1.contentType : "application/octet-stream";

        const signedUrl = await s3Repo.getSignedUrlForDownload(testUpload1, cType);
        expect(signedUrl).not.equals(null);
        var status = await download(signedUrl, 'test/download/test01.pdf', pdfOptions);
        expect(status).to.equal(true);
    });

    
    it('Test-005: getDownloadURL: download JPG table-1.jpg ', async () =>
    {
        const cType = testUpload2.contentType ? testUpload2.contentType : "";
        const signedUrl = await s3Repo.getSignedUrlForDownload(testUpload2, cType);
        expect(signedUrl).not.equals(null);
        var status = await download(signedUrl, 'test/download/table-1.jpg', jpgOptions);
        expect(status).to.equal(true);
    });


    it('Test-006: getDownloadURL: download PNG test-02.png ', async () =>
    {
        const cType = testUpload3.contentType ? testUpload3.contentType : "";
        const signedUrl = await s3Repo.getSignedUrlForDownload(testUpload3, cType);
        expect(signedUrl).not.equals(null);
        var status=await download(signedUrl, 'test/download/test-02.png', pngOptions);
        expect(status).to.equal(true);
    });

    it('Test-007: getDownloadURL: try to download a file that does not exists... ', async () =>
    {
        var status=true;
        const cType = testDownloadNotExists.contentType ? testDownloadNotExists.contentType : "";
        try {
            const signedUrl = await s3Repo.getSignedUrlForDownload(testDownloadNotExists, cType);
            expect(signedUrl).not.equals(null);
            status=await download(signedUrl, 'test/download/test-100000.png', pdfOptions);
        } catch (err: any)
        {
            status=true;
            logger.error('Error and status is : ', err.response.status);
            logger.error('Error and statusText is : ', err.response.statusText);
        }
        expect(status).to.equal(true);
    });
    

    it('Test-008: getUploadURL: updateload <parent>/test01.pdf where parent does not exists', async () => 
    {
      const cType = testUploadParentDoesNotExist.contentType ? testUploadParentDoesNotExist.contentType : "";
      try {
        const signedUrl = await s3Repo.getSignedUrlForDownload(testUploadParentDoesNotExist, cType);
        logger.debug('signed ulr for upload is: ', signedUrl);
        expect(signedUrl).not.equals(null);
        var status= await upload(signedUrl, 'test/data/test01.pdf', pdfOptions);
        expect(status).to.equal(true);
      } catch (err: any)
      {
        logger.error('Error and status is : ', err.response.status);
        logger.error('Error and statusTex is : ', err.response.statusText);
      }
    });
    
});
