const axios = require('axios');
const {Logger} = require('@docudata/common-utils');

const logger = new Logger('data-services');


/* 
 Thisi  a generic data service to fetch data from api's. It is expected that there is some
 level of interfacing to be followed for this to work in general.
 */
class GeneriaDataService
{
	/* url is base url of the api */
    constructor (url)
    {
        this.url = url;
        logger.debug('GeneriaDataService:constructor: url passed is' , url);
        this.cache = [];
    }
    /*
    Packages the response and results so that it would be consistent for the 
    caller in case of success or error 
    data = {
        ok : boolean // true if no error. false if there is an error
        message: String // error message in case of error. otherwise null
        result: [] //an array of objects. 
    }
    */
    returnStatus (response, result) 
    {
        var res = {};
        res.result = result;
        res.message = response.statusText;
        res.ok = response.ok;
        res.statusCode = response.status;
        //logger.debug('GeneriaDataService:returnStatus:: response.status: '+ response.status);
        //logger.debug('GeneriaDataService:returnStatus:: response.statusText: '+ response.statusText);
        return res;
    }

    returnExceptionStatus (err)
    {
        var res={};
        res.result = [];
        res.message = err.response.statusText;
        res.statusCode = err.response.status;
        res.ok = false;
        return res;
    }


	/* list the data items. results are returned in the form of standard 
       as per method returnStatus
	*/
    async list (path) 
    {
        var revisedurl = this.url;
    
        if ( path )
            revisedurl = this.url + path ;

        logger.debug('GeneriaDataService:list:: revisedurl is..', revisedurl);
        try {
            var response =  await axios.get(revisedurl);
            var data = await response.data;
            return this.returnStatus(response, data);
        } catch (error)
        {
            logger.error(error.response);
            return this.returnExceptionStatus(error);
        }
    }



    async get (path, id)
    {
        //var data = {};
        let revisedurl = this.url;

        if ( path )
        {
            revisedurl = revisedurl + '/' + path ;
            logger.debug('path=====', revisedurl)
        }

        if ( id )
        {
            revisedurl = revisedurl + '/' + id ;
            logger.debug('id=====', revisedurl)
        }
        
        logger.debug('GeneriaDataService:get:: revisedURL: ' + revisedurl);
        try {
            var response = await axios.get(revisedurl)
            var result = await response.data;
            return this.returnStatus(response, result);
        } catch (error)
        {
            logger.error('GeneriaDataService:get:: get error is ' + error.response.statusText);
            return this.returnExceptionStatus(error);
        }
    }

    async add (payload, path) 
    {
        let revisedurl = this.url ;
        if ( path )
            revisedurl = this.url + path ;

        logger.debug('revisedURL: ', revisedurl);
        try {
            var response = await axios.post(revisedurl, payload);
            var result = await response.data;
            return this.returnStatus(response, result);
        } catch (error)
        {
            logger.error(error.response);
            return this.returnExceptionStatus(error);
        }
    }

    async update (payload, path, id)
    {
        let revisedurl = this.url ;
        if ( path )
            revisedurl = this.url + '/' + path ;

        if ( id )
            revisedurl = revisedurl + '/' + id ;
        
        try {
            logger.debug('revised url: ' + revisedurl);
            var response = await axios.post(revisedurl, payload);
            var result = await response.data;
            return this.returnStatus(response, result)
        } catch (error)
        {
            logger.error('GeneriaDataService:update: error is: ' , error.response); 
            return this.returnExceptionStatus(error);
        }
    }

    async addPut (payload, path, options) 
    {
        let revisedurl = this.url ;
        if ( path )
            revisedurl = this.url + path ;

        logger.debug('revisedURL: ', revisedurl);


        try {
            var response = await axios.put(revisedurl, payload, options);
            var result = await response.data;
            return this.returnStatus(response, result);
        } catch (error)
        {
            logger.error(error.response.data);
            return this.returnExceptionStatus(error);
        }
    }

    async getFile (path, id, options)
    {
        //var data = {};
        let revisedurl = this.url;

        if ( path )
        {
            revisedurl = revisedurl + '/' + path ;
            logger.debug('path=====', revisedurl)
        }

        if ( id )
        {
            revisedurl = revisedurl + '/' + id ;
            logger.debug('id=====', revisedurl)
        }
        
        logger.debug('GeneriaDataService:get:: revisedURL: ' + revisedurl);
        try {
            var response = await axios.get(revisedurl, options)
            var result = await response.data;
            return this.returnStatus(response, result);
        } catch (error)
        {
            logger.error('GeneriaDataService:get:: get error is ' + error.response.statusText);
            return this.returnExceptionStatus(error);
        }
    }


} /* end of class */

module.exports = {GeneriaDataService}