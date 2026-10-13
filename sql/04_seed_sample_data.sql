-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE BLUEPRINT
-- Module: 04_seed_sample_data.sql
-- Seed script with exact historical numbers from W37 to W41 mock-ups
-- ============================================================================

INSERT INTO public.summary_weekly_metrics (
    year_week, week_label, week_number, year, start_date, end_date,
    all_transactions, active_users, new_registers, withdraw_gold_grams,
    buy_weight_15g, buy_transactions, buy_ticket_size_g,
    sell_weight_15g, sell_transactions, sell_ticket_size_g
)
VALUES 
    -- Week 37
    ('2026-W37', 'W37', 37, 2026, '2026-09-08', '2026-09-14',
     35252, 14735, 663, 788,
     2529, 23901, 1.6,
     1412, 10387, 2.0),

    -- Week 38
    ('2026-W38', 'W38', 38, 2026, '2026-09-15', '2026-09-21',
     38473, 15847, 689, 917,
     2917, 25586, 1.7,
     1727, 11932, 2.2),

    -- Week 39
    ('2026-W39', 'W39', 39, 2026, '2026-09-22', '2026-09-28',
     36911, 15127, 536, 954,
     2610, 24932, 1.6,
     1199, 11148, 1.6),

    -- Week 40
    ('2026-W40', 'W40', 40, 2026, '2026-09-29', '2026-10-05',
     59840, 24051, 682, 817,
     7031, 47745, 2.2,
     1259, 11007, 1.7),

    -- Week 41 (Active Target Week)
    ('2026-W41', 'W41', 41, 2026, '2026-10-06', '2026-10-12',
     40663, 17895, 514, 667,
     2851, 28475, 1.5,
     1263, 11310, 1.7)

ON CONFLICT (year_week) DO UPDATE SET
    all_transactions = EXCLUDED.all_transactions,
    active_users = EXCLUDED.active_users,
    new_registers = EXCLUDED.new_registers,
    withdraw_gold_grams = EXCLUDED.withdraw_gold_grams,
    buy_weight_15g = EXCLUDED.buy_weight_15g,
    buy_transactions = EXCLUDED.buy_transactions,
    buy_ticket_size_g = EXCLUDED.buy_ticket_size_g,
    sell_weight_15g = EXCLUDED.sell_weight_15g,
    sell_transactions = EXCLUDED.sell_transactions,
    sell_ticket_size_g = EXCLUDED.sell_ticket_size_g;
