import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';


import { catchError, map } from 'rxjs/operators';
import { Observable ,  of } from 'rxjs';

import { Utils } from '../util/utils';
import { Constants } from '../util/constants';


import * as Jsonix from 'terrabrasilis-jsonix';
import * as ogcSchemas from 'ogc-schemas';
import * as w3cSchemas from 'w3c-schemas';

import { text } from 'd3';
import { AuthenticationService } from './authentication.service';

@Injectable()
export class WmsCapabilitiesProviderService {

  private proxy: string;
  private jsonix: any;
  private authProxyURL: string;

  constructor(private http: HttpClient) {
    this.proxy = Constants.PROXY_OGC; 
    if(Constants.AUTHENTICATION_PROXY_HOST)
    {
      
      let baseURL = Constants.BASE_URL;

      let authProxyHost = Constants.AUTHENTICATION_PROXY_HOST;
      this.authProxyURL = new URL(authProxyHost, baseURL).href;
    }     
  }

  getCapabilities(base_url: string) {
    
    let httpOptions = {
      headers: new HttpHeaders({}),
      observe: 'response' as 'response' ,
      responseType: 'text' as 'text'
    };

    base_url = Utils.removeURLParameters(base_url);
    let url = base_url + '?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.3.0';
    
        
    if(AuthenticationService.isAuthenticated())
    {  
      let authorizationValue = 'Bearer ' + AuthenticationService.getToken();
      httpOptions.headers = new HttpHeaders({ 'Authorization': authorizationValue });
      url = this.authProxyURL + url;
    }
    else
    {
      url = this.proxy + encodeURIComponent(url);
    }

    return this.http.get(url, httpOptions).pipe(
        map(response => response),
        catchError(this.handleError())
      );
  }

  parseCapabilitiesToJsonFormat(xml: string) {
    this.jsonix = Jsonix.Jsonix;

    const wmsContext = new this.jsonix.Context([
        w3cSchemas.XLink_1_0,
        ogcSchemas.OWS_1_0_0,
        ogcSchemas.SLD_1_1_0,
        ogcSchemas.SE_1_1_0,
        ogcSchemas.Filter_1_1_0,
        ogcSchemas.GML_3_1_1,
        ogcSchemas.SMIL_2_0_Language,
        ogcSchemas.SMIL_2_0,
        ogcSchemas.WMS_1_3_0
      ],
      {
          namespacePrefixes : {
              'http://www.opengis.net/wms' : '',
              'http://www.w3.org/1999/xlink' : 'xlink'
          },
          mappingStyle : 'simplified'
      });

    // Create an unmarshaller (parser)
    const unmarshaller = wmsContext.createUnmarshaller();

    // Unmarshal from response
    return unmarshaller.unmarshalString(xml);
  }

  
  public static removeAccessTokenFromURL(url: any)
  {
    let urlWithoutAccessToken = '';
    let token='';
    if(url.includes('access_token='))
    {
      let urlSplitParamsList = url.split('?');
      
      let urlParamsList = urlSplitParamsList[1].split('&');
      for (let i = 0; i < urlParamsList.length; i++) {
        let param = urlParamsList[i];
        if(param.includes('access_token='))
        {
          token=param;
          break;
        }
      }
      urlWithoutAccessToken=url.replace(token,'');
    }
    return urlWithoutAccessToken;
    
  }

  public static getDimensionsFromLayer(parsedCapabilities: any)
  {
    if(parsedCapabilities)
    {
      if(parsedCapabilities.WMS_Capabilities.capability.layer.layer && parsedCapabilities.WMS_Capabilities.capability.layer.layer.length>0)
      {
        if(parsedCapabilities.WMS_Capabilities.capability.layer.layer[0].dimension)
        {
          let dimensionsStr = parsedCapabilities.WMS_Capabilities.capability.layer.layer[0].dimension[0].value;
          
          let dimensionStrList = dimensionsStr.split(',');
          
          let dimensionList = new Array();
          
          for (let i = 0; i < dimensionStrList.length; i++) {
            
            let dimensionStrWithoutTZ = dimensionStrList[i].replace('Z',''); //Timezone doesn't import in this case. Removing and assuming local date and time.

            let dimension = (new Date(dimensionStrWithoutTZ));
            dimensionList.push(dimension);

          }

          return dimensionList;
        } 
        else
        {
          throw Error("Layer does not contain any dimension!");
        }
      }
    }
    throw Error("Failed to get or parse time dimension from layer capabilities");
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>() {
    return (error: any): Observable<any> => {
      // Let the app keep running by returning an empty result.
      // return of(result as T);
      return of(error as any);
    };
  }
  

}
