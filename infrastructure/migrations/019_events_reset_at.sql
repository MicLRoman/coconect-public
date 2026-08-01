-- Дата следующего пополнения дннеров (= конец текущего периода Stripe-подписки).
-- Заполняется вебхуком на checkout.session.completed и invoice.paid.
-- Код устойчив к отсутствию этой колонки (guarded), но без неё дата пополнения не показывается.
ALTER TABLE users ADD COLUMN IF NOT EXISTS events_reset_at timestamptz;
