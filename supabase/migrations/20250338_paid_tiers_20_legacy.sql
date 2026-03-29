-- Migra degraus antigos paid_21 … paid_28 (28-tier) para paid_20 (escada atual de 20 preços).

UPDATE businesses
SET plan = 'paid_20', updated_at = now()
WHERE plan ~ '^paid_(2[1-8])$';

UPDATE profiles
SET recommended_plan = 'paid_20', updated_at = now()
WHERE recommended_plan ~ '^paid_(2[1-8])$';
