import re

with open('c:/isms-compass/frontend/src/pages/StepModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    r'function Step1Form\(\) \{': r'function Step1Form({ initialData = {}, onChange }: any) {',
    r"const \[scopeStatement, setScopeStatement\] = useState\(''\);": r"const [scopeStatement, setScopeStatement] = useState(initialData.scopeStatement || '');",
    r"const \[departments, setDepartments\] = useState\(\[''\]\);": r"const [departments, setDepartments] = useState(initialData.departments || ['']);",
    r"const \[locations, setLocations\] = useState\(\[''\]\);": r"const [locations, setLocations] = useState(initialData.locations || ['']);",
    r"const \[exclusions, setExclusions\] = useState\(''\);": r"const [exclusions, setExclusions] = useState(initialData.exclusions || '');",
    r"const addDept = \(\) =>": r"useEffect(() => { onChange?.({ scopeStatement, departments, locations, exclusions }); }, [scopeStatement, departments, locations, exclusions, onChange]);\n  const addDept = () =>",

    r'function Step2Form\(\) \{': r'function Step2Form({ initialData = {}, onChange }: any) {',
    r"const \[policyText, setPolicyText\] = useState\(''\);": r"const [policyText, setPolicyText] = useState(initialData.policyText || '');",
    r"const \[objectives, setObjectives\] = useState\(\['', '', ''\]\);": r"const [objectives, setObjectives] = useState(initialData.objectives || ['', '', '']);",
    r"const \[signedBy, setSignedBy\] = useState\(''\);": r"const [signedBy, setSignedBy] = useState(initialData.signedBy || '');",
    r"const \[reviewDate, setReviewDate\] = useState\(''\);": r"const [reviewDate, setReviewDate] = useState(initialData.reviewDate || '');",
    r"return \(\n    <div className=\"space-y-6\">": r"useEffect(() => { onChange?.({ policyText, objectives, signedBy, reviewDate }); }, [policyText, objectives, signedBy, reviewDate, onChange]);\n  return (\n    <div className=\"space-y-6\">",

    r'function Step3Form\(\) \{': r'function Step3Form({ initialData = {}, onChange }: any) {',
    r"const \[matrixSize, setMatrixSize\] = useState\('4'\);": r"const [matrixSize, setMatrixSize] = useState(initialData.matrixSize || '4');",
    r"const \[acceptableRisk, setAcceptableRisk\] = useState\(6\);": r"const [acceptableRisk, setAcceptableRisk] = useState(initialData.acceptableRisk || 6);",
    r"const likelihoodLabels = ": r"useEffect(() => { onChange?.({ matrixSize, acceptableRisk }); }, [matrixSize, acceptableRisk, onChange]);\n  const likelihoodLabels = ",

    r'function Step4Form\(\) \{': r'function Step4Form({ initialData = {}, onChange }: any) {',
    r"const \[assets, setAssets\] = useState\(\[\{ name: '', type: 'Data', owner: '', sensitivity: 'Medium' \}\]\);": r"const [assets, setAssets] = useState(initialData.assets || [{ name: '', type: 'Data', owner: '', sensitivity: 'Medium' }]);",
    r"const types = ": r"useEffect(() => { onChange?.({ assets }); }, [assets, onChange]);\n  const types = ",

    r'function Step5Form\(\) \{': r'function Step5Form({ initialData = {}, onChange }: any) {',
    r"const \[treatments, setTreatments\] = useState\(\[": r"const [treatments, setTreatments] = useState(initialData.treatments || [",
    r"const update = \(i: number, field: string, value: string\) =>": r"useEffect(() => { onChange?.({ treatments }); }, [treatments, onChange]);\n  const update = (i: number, field: string, value: string) =>",

    r'function Step6Form\(\) \{': r'function Step6Form({ initialData = {}, onChange }: any) {',

    r'function Step7Form\(\) \{': r'function Step7Form({ initialData = {}, onChange }: any) {',
    r"const \[roles, setRoles\] = useState\(defaultRoles\.map\(r => \(\{ \.\.\.r, assignedTo: '' \}\)\)\);": r"const [roles, setRoles] = useState(initialData.roles || defaultRoles.map(r => ({ ...r, assignedTo: '' })));",
    r"return \(\n    <div className=\"space-y-3\">": r"useEffect(() => { onChange?.({ roles }); }, [roles, onChange]);\n  return (\n    <div className=\"space-y-3\">",

    r'function Step8Form\(\) \{': r'function Step8Form({ initialData = {}, onChange }: any) {',
    r"const \[items, setItems\] = useState\(\[": r"const [items, setItems] = useState(initialData.items || [",
    r"const update = \(i: number, field: string, value: string \| boolean\) =>": r"useEffect(() => { onChange?.({ items }); }, [items, onChange]);\n  const update = (i: number, field: string, value: string | boolean) =>",

    r'function Step9Form\(\) \{': r'function Step9Form({ initialData = {}, onChange }: any) {',
    r"const \[docs, setDocs\] = useState\(procedures\.map\(p => \(\{ name: p, status: 'Not Started', owner: '' \}\)\)\);": r"const [docs, setDocs] = useState(initialData.docs || procedures.map(p => ({ name: p, status: 'Not Started', owner: '' })));",
    r"const statusColors: Record<string, string>": r"useEffect(() => { onChange?.({ docs }); }, [docs, onChange]);\n  const statusColors: Record<string, string>",

    r'function Step10Form\(\) \{': r'function Step10Form({ initialData = {}, onChange }: any) {',
    r"const \[reviewFreq, setReviewFreq\] = useState\('Quarterly'\);": r"const [reviewFreq, setReviewFreq] = useState(initialData.reviewFreq || 'Quarterly');",
    r"const \[auditFreq, setAuditFreq\] = useState\('Annual'\);": r"const [auditFreq, setAuditFreq] = useState(initialData.auditFreq || 'Annual');",
    r"const \[kpis, setKpis\] = useState\(\[": r"const [kpis, setKpis] = useState(initialData.kpis || [",
    r"return \(\n    <div className=\"space-y-6\">": r"useEffect(() => { onChange?.({ reviewFreq, auditFreq, kpis }); }, [reviewFreq, auditFreq, kpis, onChange]);\n  return (\n    <div className=\"space-y-6\">",
}

for k, v in replacements.items():
    content = re.sub(k, v, content)

# Now for StepModule
# Add stepFormData state
# Pass stepFormData to StepForm
# Update handleSave and handleComplete

content = re.sub(
    r"const \[stepData, setStepData\] = useState<Record<string, unknown> \| null>\(null\);",
    r"const [stepData, setStepData] = useState<Record<string, unknown> | null>(null);\n  const [stepFormData, setStepFormData] = useState<Record<string, unknown>>({});",
    content
)

content = re.sub(
    r"\.then\(data => \{ setStepData\(data\); setStepLoading\(false\); \}\)",
    r".then(data => { setStepData(data); setStepFormData((data as any).draft_data || {}); setStepLoading(false); })",
    content
)

content = re.sub(
    r"<CardContent><StepForm /></CardContent>",
    r"<CardContent><StepForm initialData={stepData?.draft_data || {}} onChange={setStepFormData} /></CardContent>",
    content
)

content = re.sub(
    r"body: JSON\.stringify\(\{\}\),",
    r"body: JSON.stringify(stepFormData),",
    content
)

content = re.sub(
    r"await apiFetch\(`/steps/\$\{step\}/complete`, \{ method: 'POST' \}\);",
    r"await apiFetch(`/steps/${step}/complete`, { method: 'POST', body: JSON.stringify(stepFormData) });",
    content
)

content = re.sub(
    r"navigate\(step < 10 \? `/steps/\$\{step \+ 1\}` : '/dashboard'\);",
    r"navigate('/steps');",
    content
)

with open('c:/isms-compass/frontend/src/pages/StepModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched successfully!")
