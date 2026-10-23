declare const _exports: {
    propertySchema: z.ZodObject<{
        title: z.ZodString;
        price: z.ZodCoercedNumber<unknown>;
        m2: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        ccaa: z.ZodString;
        rooms: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
        baths: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
        estate_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
            new: "new";
            secondhand: "secondhand";
        }>>>;
        garage: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
            no: "no";
            opcional: "opcional";
            si: "si";
        }>>>;
        zone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        url: z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<"">]>;
        photos: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        elevator: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
            desconocido: "desconocido";
            no: "no";
            si: "si";
        }>>>;
        comments: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rating: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
        latitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        longitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        status: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
            active: "active";
            inactive: "inactive";
            unknown: "unknown";
        }>>>;
        last_checked_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        workspace_id: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    }, z.core.$strip>;
    queryUrlSchema: z.ZodObject<{
        url: z.ZodString;
    }, z.core.$strip>;
};
export = _exports;
import { z } from 'zod';
