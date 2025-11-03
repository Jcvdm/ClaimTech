export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          type: string
          assessment_terms_and_conditions: string | null
          estimate_terms_and_conditions: string | null
          frc_terms_and_conditions: string | null
          address: string | null
          city: string | null
          contact_name: string | null
          email: string | null
          phone: string | null
          postal_code: string | null
          notes: string | null
          borderline_writeoff_percentage: number | null
          total_writeoff_percentage: number | null
          salvage_percentage: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          assessment_terms_and_conditions?: string | null
          estimate_terms_and_conditions?: string | null
          frc_terms_and_conditions?: string | null
          address?: string | null
          city?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          postal_code?: string | null
          notes?: string | null
          borderline_writeoff_percentage?: number | null
          total_writeoff_percentage?: number | null
          salvage_percentage?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          assessment_terms_and_conditions?: string | null
          estimate_terms_and_conditions?: string | null
          frc_terms_and_conditions?: string | null
          address?: string | null
          city?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          postal_code?: string | null
          notes?: string | null
          borderline_writeoff_percentage?: number | null
          total_writeoff_percentage?: number | null
          salvage_percentage?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}
