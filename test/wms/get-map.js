const { describe, it, xit } = require('mocha');
const { expect } = require('chai');
const { hookServersStartStop } = require('../helpers/servers');
const { hookGetMap, wmsRequest } = require('../helpers/wms');
const StubService = require('../helpers/stub-service');

describe('WMS GetMap', function () {
  const collection = 'C1215669046-GES_DISC';
  const variable = 'V1224729877-GES_DISC';
  const defaultGranuleId = 'G1224343298-GES_DISC';

  hookServersStartStop();

  describe('when provided a valid set of parameters', function () {
    const query = {
      service: 'WMS',
      request: 'GetMap',
      layers: `${collection}/${variable}`,
      crs: 'CRS:84',
      format: 'image/tiff',
      styles: '',
      width: 128,
      height: 128,
      version: '1.3.0',
      bbox: '-180,-90,180,90',
      transparent: 'TRUE',
    };

    describe('calling the backend service', function () {
      StubService.hook({ params: { redirect: 'http://example.com' } });
      hookGetMap(collection, query);

      it('passes the bbox parameter to the backend', function () {
        expect(this.service.operation.boundingRectangle).to.eql([-180, -90, 180, 90]);
      });

      it('passes the source collection, variables, and granules to the backend', function () {
        const source = this.service.operation.sources[0];
        expect(source.collection).to.equal(collection);
        expect(source.variables[0].id).to.equal(variable);
        expect(source.granules.length === 1);
        expect(source.granules[0].id).to.equal(defaultGranuleId);
      });

      it('passes the crs parameter to the backend', function () {
        expect(this.service.operation.crs).to.equal('CRS:84');
      });

      it('passes the format parameter to the backend', function () {
        expect(this.service.operation.outputFormat).to.equal('image/tiff');
      });

      it('passes the width parameter to the backend', function () {
        expect(this.service.operation.outputWidth).to.equal(128);
      });

      it('passes the height parameter to the backend', function () {
        expect(this.service.operation.outputHeight).to.equal(128);
      });

      it('passes the transparent parameter to the backend', function () {
        expect(this.service.operation.isTransparent).to.equal(true);
      });
    });

    describe('and the backend service calls back with an error parameter', function () {
      StubService.hook({ params: { error: 'Something bad happened' } });
      hookGetMap(collection, query);

      it('propagates the error message into the response', function () {
        expect(this.res.text).to.equal('Something bad happened');
      });

      it('responds with an HTTP 400 "Bad Request" status code', function () {
        expect(this.res.status).to.equal(400);
      });
    });

    describe('and the backend service calls back with a redirect', function () {
      StubService.hook({ params: { redirect: 'http://example.com' } });
      hookGetMap(collection, query);

      it('redirects the client to the provided URL', function () {
        expect(this.res.status).to.equal(302);
        expect(this.res.headers.location).to.equal('http://example.com');
      });
    });

    describe('and the backend service provides POST data', function () {
      StubService.hook({
        body: 'realistic mock data',
      });
      hookGetMap(collection, query);

      it('sends the data to the client', function () {
        expect(this.res.text).to.equal('realistic mock data');
      });

      it('returns an HTTP 200 "OK" status code', function () {
        expect(this.res.status).to.equal(200);
      });

      xit('propagates the Content-Type header to the client', function () {
        // TODO: This is currently not working, but it seems to be on the StubService side
        //   failing to send headers, not the service invoker failing to deal with them
        expect(this.res.headers.contentType).to.equal('text/plain');
      });
    });
  });
  describe('can provide an optional granule ID', function () {
    const specificGranuleId = 'G1224343299-GES_DISC';
    const query = {
      service: 'WMS',
      request: 'GetMap',
      layers: `${collection}/${variable}`,
      crs: 'CRS:84',
      format: 'image/tiff',
      styles: '',
      width: 128,
      height: 128,
      version: '1.3.0',
      bbox: '-180,-90,180,90',
      transparent: 'TRUE',
      granuleId: specificGranuleId,
    };

    describe('calling the backend service', function () {
      StubService.hook({ params: { redirect: 'http://example.com' } });
      hookGetMap(collection, query);

      it('passes the source collection, variables, and granule to the backend', function () {
        const source = this.service.operation.sources[0];
        expect(source.collection).to.equal(collection);
        expect(source.variables[0].id).to.equal(variable);
        expect(source.granules.length === 1);
        expect(source.granules[0].id).to.equal(specificGranuleId);
      });
    });

    describe('when the backend service does not respond', function () {
      // Starting up docker image can take more than 2 seconds
      this.timeout(10000);
      StubService.hookDockerImage('alpine:3.10.3');
      hookGetMap(collection, query);

      it('returns an error to the client', async function () {
        expect(this.res.text).to.equal('Child process died without responding.');
      });
    });
  });

  describe('if no matching granules are found', function () {
    const bogusGranuleId = 'G123-BOGUS';
    const query = {
      service: 'WMS',
      request: 'GetMap',
      layers: `${collection}/${variable}`,
      crs: 'CRS:84',
      format: 'image/tiff',
      styles: '',
      width: 128,
      height: 128,
      version: '1.3.0',
      bbox: '-180,-90,180,90',
      transparent: 'TRUE',
      granuleId: bogusGranuleId,
    };

    it('returns an HTTP 400 "Bad Request" error with explanatory message when no request parameter is set', async function () {
      const res = await wmsRequest(this.frontend, collection, query);
      expect(res.status).to.equal(400);
      expect(res.body).to.eql({ errors: ['No matching granules found.'] });
    });
  });
});
