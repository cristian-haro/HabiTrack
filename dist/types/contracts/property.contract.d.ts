import { z } from 'zod';
export declare const PropertyStatusSchema: z.ZodEnum<{
    comprado: "comprado";
    contactado: "contactado";
    descartado: "descartado";
    interesado: "interesado";
    oferta_presentada: "oferta_presentada";
    visita_pendiente: "visita_pendiente";
    visitado: "visitado";
}>;
export declare const PropertyContractSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    user_id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    workspace_id: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
    titulo: z.ZodString;
    precio: z.ZodNumber;
    enlace: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    portal: z.ZodOptional<z.ZodString>;
    localidad: z.ZodOptional<z.ZodString>;
    comunidad_autonoma: z.ZodDefault<z.ZodString>;
    superficie_m2: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    habitaciones: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    banos: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    estado: z.ZodDefault<z.ZodEnum<{
        comprado: "comprado";
        contactado: "contactado";
        descartado: "descartado";
        interesado: "interesado";
        oferta_presentada: "oferta_presentada";
        visita_pendiente: "visita_pendiente";
        visitado: "visitado";
    }>>;
    tipo_vivienda: z.ZodDefault<z.ZodEnum<{
        obra_nueva: "obra_nueva";
        segunda_mano: "segunda_mano";
    }>>;
    fotos: z.ZodDefault<z.ZodArray<z.ZodString>>;
    lat: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    lng: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    notas: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const PropertyFilterSchema: z.ZodObject<{
    estado: z.ZodOptional<z.ZodEnum<{
        comprado: "comprado";
        contactado: "contactado";
        descartado: "descartado";
        interesado: "interesado";
        oferta_presentada: "oferta_presentada";
        visita_pendiente: "visita_pendiente";
        visitado: "visitado";
    }>>;
    workspace_id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    min_precio: z.ZodOptional<z.ZodNumber>;
    max_precio: z.ZodOptional<z.ZodNumber>;
    localidad: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PropertyStatus = z.infer<typeof PropertyStatusSchema>;
export type PropertyContract = z.infer<typeof PropertyContractSchema>;
export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;
