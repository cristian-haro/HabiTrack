import { z } from 'zod';
export declare const AutonomousCommunitySchema: z.ZodEnum<{
    Andalucía: "Andalucía";
    Aragón: "Aragón";
    Asturias: "Asturias";
    Baleares: "Baleares";
    Canarias: "Canarias";
    Cantabria: "Cantabria";
    "Castilla y Le\u00F3n": "Castilla y León";
    "Castilla-La Mancha": "Castilla-La Mancha";
    Cataluña: "Cataluña";
    Ceuta: "Ceuta";
    "Comunidad Valenciana": "Comunidad Valenciana";
    Extremadura: "Extremadura";
    Galicia: "Galicia";
    "La Rioja": "La Rioja";
    Madrid: "Madrid";
    Melilla: "Melilla";
    Murcia: "Murcia";
    Navarra: "Navarra";
    "Pa\u00EDs Vasco": "País Vasco";
}>;
export declare const CalculateExpensesInputSchema: z.ZodObject<{
    precio: z.ZodNumber;
    comunidad_autonoma: z.ZodDefault<z.ZodEnum<{
        Andalucía: "Andalucía";
        Aragón: "Aragón";
        Asturias: "Asturias";
        Baleares: "Baleares";
        Canarias: "Canarias";
        Cantabria: "Cantabria";
        "Castilla y Le\u00F3n": "Castilla y León";
        "Castilla-La Mancha": "Castilla-La Mancha";
        Cataluña: "Cataluña";
        Ceuta: "Ceuta";
        "Comunidad Valenciana": "Comunidad Valenciana";
        Extremadura: "Extremadura";
        Galicia: "Galicia";
        "La Rioja": "La Rioja";
        Madrid: "Madrid";
        Melilla: "Melilla";
        Murcia: "Murcia";
        Navarra: "Navarra";
        "Pa\u00EDs Vasco": "País Vasco";
    }>>;
    tipo_vivienda: z.ZodDefault<z.ZodEnum<{
        obra_nueva: "obra_nueva";
        segunda_mano: "segunda_mano";
    }>>;
    porcentaje_financiacion: z.ZodDefault<z.ZodNumber>;
    plazo_anos: z.ZodDefault<z.ZodNumber>;
    tipo_interes_anual: z.ZodDefault<z.ZodNumber>;
    tasacion_estimada: z.ZodDefault<z.ZodNumber>;
    gestoria_estimada: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const CalculateExpensesOutputSchema: z.ZodObject<{
    precio: z.ZodNumber;
    impuestos: z.ZodObject<{
        tipo: z.ZodEnum<{
            ITP: "ITP";
            IVA_AJD: "IVA_AJD";
        }>;
        tipo_impositivo_pct: z.ZodNumber;
        importe: z.ZodNumber;
    }, z.core.$strip>;
    gastos_notaria_registro: z.ZodNumber;
    tasacion: z.ZodNumber;
    gestoria: z.ZodNumber;
    total_gastos_compra: z.ZodNumber;
    hipoteca: z.ZodObject<{
        capital_prestado: z.ZodNumber;
        cuota_mensual: z.ZodNumber;
        total_intereses: z.ZodNumber;
        coste_total_prestamo: z.ZodNumber;
    }, z.core.$strip>;
    capital_propio_necesario: z.ZodNumber;
}, z.core.$strip>;
export type AutonomousCommunity = z.infer<typeof AutonomousCommunitySchema>;
export type CalculateExpensesInput = z.infer<typeof CalculateExpensesInputSchema>;
export type CalculateExpensesOutput = z.infer<typeof CalculateExpensesOutputSchema>;
