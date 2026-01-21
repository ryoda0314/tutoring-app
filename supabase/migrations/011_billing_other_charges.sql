-- その他の請求項目（違約金、教材費など）
CREATE TABLE billing_other_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL, -- 'YYYY-MM' format (請求対象月)
    charge_date DATE NOT NULL, -- いつ分の違約金か（例：無断キャンセルした日）
    description TEXT NOT NULL, -- 説明（例：「無断キャンセル違約金」）
    amount INTEGER NOT NULL, -- 金額
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_billing_other_charges_student_id ON billing_other_charges(student_id);
CREATE INDEX idx_billing_other_charges_year_month ON billing_other_charges(year_month);

-- RLS
ALTER TABLE billing_other_charges ENABLE ROW LEVEL SECURITY;

-- 先生は自分の生徒のその他請求を閲覧・作成・更新・削除可能
CREATE POLICY "Teachers can manage their students other charges"
ON billing_other_charges FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = billing_other_charges.student_id
        AND s.teacher_id = auth.uid()
    )
);

-- 親は自分の子供のその他請求を閲覧可能
CREATE POLICY "Parents can view their children other charges"
ON billing_other_charges FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND p.student_id = billing_other_charges.student_id
    )
);
