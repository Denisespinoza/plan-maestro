-- Migration 019: Set moldey.ar@gmail.com as asistente
UPDATE public.user_profiles
SET role = 'asistente'
WHERE email ILIKE 'moldey.ar@gmail.com';
