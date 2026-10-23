declare const _exports: {
    scrapePropertyUrl: typeof scrapePropertyUrl;
};
export = _exports;
/**
 * Service to analyze real estate URLs and extract structured property data
 */
declare function scrapePropertyUrl(urlStr: any): Promise<{
    success: boolean;
    source: string;
    error: string;
    data?: undefined;
} | {
    error?: undefined;
    success: boolean;
    source: string;
    data: {
        title: any;
        price: any;
        m2: any;
        rooms: any;
        baths: any;
        estate_type: string;
        garage: string;
        elevator: string;
        zone: string;
        ccaa: any;
        photos: string;
        latitude: any;
        longitude: any;
        comments: any;
        url: any;
    };
}>;
