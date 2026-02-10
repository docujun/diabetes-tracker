import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Download, Cloud, Trash2, TrendingUp } from 'lucide-react';

const DiabetesTracker = () => {
  const [records, setRecords] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [bloodTests, setBloodTests] = useState([]);
  const [inbodyRecords, setInbodyRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [googleAuth, setGoogleAuth] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('today');
  
  const [formData, setFormData] = useState({
    date: currentDate,
    breakfast_before: '',
    breakfast_after: '',
    breakfast_menu: '',
    breakfast_symptoms: '',
    lunch_before: '',
    lunch_after: '',
    lunch_menu: '',
    lunch_symptoms: '',
    dinner_before: '',
    dinner_after: '',
    dinner_menu: '',
    dinner_symptoms: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    exercise_type: '',
    exercise_duration: '',
  });

  const [bloodTestText, setBloodTestText] = useState('');
  const [inbodyText, setInbodyText] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');

  const [newMedicine, setNewMedicine] = useState({
    name: '',
    dosage: '',
    frequency: '',
    prescriptionDate: currentDate,
    notes: '',
  });

  const [newSupplement, setNewSupplement] = useState({
    name: '',
    dosage: '',
    frequency: '',
    startDate: currentDate,
    notes: '',
  });

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const recordResult = await window.storage.get('diabetes-records');
        if (recordResult) setRecords(JSON.parse(recordResult.value));
        
        const medResult = await window.storage.get('diabetes-medicines');
        if (medResult) setMedicines(JSON.parse(medResult.value));
        
        const supResult = await window.storage.get('diabetes-supplements');
        if (supResult) setSupplements(JSON.parse(supResult.value));

        const btResult = await window.storage.get('diabetes-blood-tests');
        if (btResult) setBloodTests(JSON.parse(btResult.value));

        const ibResult = await window.storage.get('diabetes-inbody');
        if (ibResult) setInbodyRecords(JSON.parse(ibResult.value));

        const prResult = await window.storage.get('diabetes-prescriptions');
        if (prResult) setPrescriptions(JSON.parse(prResult.value));
      } catch (error) {
        console.log('로컬 데이터 로드:', error);
      }
    };
    loadData();
    initializeGoogleAPI();
  }, []);

  const saveAllData = async () => {
    try {
      await window.storage.set('diabetes-records', JSON.stringify(records));
      await window.storage.set('diabetes-medicines', JSON.stringify(medicines));
      await window.storage.set('diabetes-supplements', JSON.stringify(supplements));
      await window.storage.set('diabetes-blood-tests', JSON.stringify(bloodTests));
      await window.storage.set('diabetes-inbody', JSON.stringify(inbodyRecords));
      await window.storage.set('diabetes-prescriptions', JSON.stringify(prescriptions));
    } catch (error) {
      console.error('데이터 저장 실패:', error);
    }
  };

  // 자동 파싱 함수들
  const parseBloodTest = (text) => {
    const result = { testDate: '', items: {} };
    const dateMatch = text.match(/검사일[\s:]*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/);
    if (dateMatch) result.testDate = dateMatch[1];

    const patterns = {
      'HbA1c': /HbA1c[\s:]*(\d+\.?\d*)/i,
      '공복혈당': /공복혈당[\s:]*(\d+\.?\d*)/i,
      '총콜레스테롤': /총콜레스테롤[\s:]*(\d+\.?\d*)/i,
      'HDL': /HDL[\s:]*(\d+\.?\d*)/i,
      'LDL': /LDL[\s:]*(\d+\.?\d*)/i,
      '중성지방': /중성지방[\s:]*(\d+\.?\d*)/i,
      'GOT': /GOT[\s:]*(\d+\.?\d*)/i,
      'GPT': /GPT[\s:]*(\d+\.?\d*)/i,
      '크레아티닌': /크레아티닌[\s:]*(\d+\.?\d*)/i,
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) result.items[key] = parseFloat(match[1]);
    });

    return result;
  };

  const parseInbody = (text) => {
    const result = { measureDate: '', items: {} };
    const dateMatch = text.match(/측정일[\s:]*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/);
    if (dateMatch) result.measureDate = dateMatch[1];

    const patterns = {
      '체중': /체중[\s:]*(\d+\.?\d*)/,
      '체지방률': /체지방률[\s:]*(\d+\.?\d*)/,
      '근육량': /근육량[\s:]*(\d+\.?\d*)/,
      '기초대사량': /기초대사량[\s:]*(\d+\.?\d*)/,
      'BMI': /BMI[\s:]*(\d+\.?\d*)/,
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) result.items[key] = parseFloat(match[1]);
    });

    return result;
  };

  const parsePrescription = (text) => {
    const result = { prescriptionDate: '', medicines: [] };
    const dateMatch = text.match(/처방일[\s:]*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/);
    if (dateMatch) result.prescriptionDate = dateMatch[1];

    const medicinePattern = /[-•]\s*([^:,\n]+?)[\s:,]*(\d+)\s*mg?\s*[×x*]?\s*(\d+)\s*회/gi;
    let match;
    while ((match = medicinePattern.exec(text)) !== null) {
      result.medicines.push({
        name: match[1].trim(),
        dosage: match[2],
        frequency: match[3]
      });
    }

    return result;
  };

  // 저장 함수들
  const saveBloodTest = () => {
    const parsed = parseBloodTest(bloodTestText);
    if (!parsed.testDate) {
      alert('검사일을 찾을 수 없습니다. "검사일: YYYY-MM-DD" 형식으로 입력해주세요.');
      return;
    }

    const newTest = {
      id: Date.now(),
      ...parsed,
      timestamp: new Date().toISOString()
    };

    const updatedBloodTests = [newTest, ...bloodTests];
    setBloodTests(updatedBloodTests);
    window.storage.set('diabetes-blood-tests', JSON.stringify(updatedBloodTests));
    setBloodTestText('');
    alert('혈액검사 결과가 저장되었습니다!');
  };

  const saveInbody = () => {
    const parsed = parseInbody(inbodyText);
    if (!parsed.measureDate) {
      alert('측정일을 찾을 수 없습니다. "측정일: YYYY-MM-DD" 형식으로 입력해주세요.');
      return;
    }

    const newTest = {
      id: Date.now(),
      ...parsed,
      timestamp: new Date().toISOString()
    };

    const updatedInbody = [newTest, ...inbodyRecords];
    setInbodyRecords(updatedInbody);
    window.storage.set('diabetes-inbody', JSON.stringify(updatedInbody));
    setInbodyText('');
    alert('인바디 결과가 저장되었습니다!');
  };

  const savePrescription = () => {
    const parsed = parsePrescription(prescriptionText);
    if (!parsed.prescriptionDate) {
      alert('처방일을 찾을 수 없습니다. "처방일: YYYY-MM-DD" 형식으로 입력해주세요.');
      return;
    }

    const newPrescription = {
      id: Date.now(),
      ...parsed,
      timestamp: new Date().toISOString()
    };

    const updatedPrescriptions = [newPrescription, ...prescriptions];
    setPrescriptions(updatedPrescriptions);
    window.storage.set('diabetes-prescriptions', JSON.stringify(updatedPrescriptions));
    setPrescriptionText('');
    alert('처방전이 저장되었습니다!');
  };

  const addMedicine = () => {
    if (!newMedicine.name) return;
    
    const medicine = {
      id: Date.now(),
      ...newMedicine,
      strength: parseFloat(newMedicine.dosage) * parseInt(newMedicine.frequency),
      timestamp: new Date().toISOString()
    };
    
    const updatedMedicines = [...medicines, medicine];
    setMedicines(updatedMedicines);
    window.storage.set('diabetes-medicines', JSON.stringify(updatedMedicines));
    setNewMedicine({ name: '', dosage: '', frequency: '', prescriptionDate: currentDate, notes: '' });
  };

  const deleteMedicine = (id) => {
    const updatedMedicines = medicines.filter(m => m.id !== id);
    setMedicines(updatedMedicines);
    window.storage.set('diabetes-medicines', JSON.stringify(updatedMedicines));
  };

  const addSupplement = () => {
    if (!newSupplement.name) return;
    
    const supplement = {
      id: Date.now(),
      ...newSupplement,
      timestamp: new Date().toISOString()
    };
    
    const updatedSupplements = [...supplements, supplement];
    setSupplements(updatedSupplements);
    window.storage.set('diabetes-supplements', JSON.stringify(updatedSupplements));
    setNewSupplement({ name: '', dosage: '', frequency: '', startDate: currentDate, notes: '' });
  };

  const deleteSupplement = (id) => {
    const updatedSupplements = supplements.filter(s => s.id !== id);
    setSupplements(updatedSupplements);
    window.storage.set('diabetes-supplements', JSON.stringify(updatedSupplements));
  };

  const addRecord = () => {
    const newRecord = {
      id: Date.now(),
      date: currentDate,
      ...formData,
      timestamp: new Date().toISOString()
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    window.storage.set('diabetes-records', JSON.stringify(updatedRecords));
    
    setFormData({
      date: currentDate,
      breakfast_before: '', breakfast_after: '', breakfast_menu: '', breakfast_symptoms: '',
      lunch_before: '', lunch_after: '', lunch_menu: '', lunch_symptoms: '',
      dinner_before: '', dinner_after: '', dinner_menu: '', dinner_symptoms: '',
      systolic_bp: '', diastolic_bp: '', heart_rate: '', exercise_type: '', exercise_duration: '',
    });
  };

  const deleteBloodTest = (id) => {
    const updatedBloodTests = bloodTests.filter(t => t.id !== id);
    setBloodTests(updatedBloodTests);
    window.storage.set('diabetes-blood-tests', JSON.stringify(updatedBloodTests));
  };

  const deleteInbody = (id) => {
    const updatedInbody = inbodyRecords.filter(t => t.id !== id);
    setInbodyRecords(updatedInbody);
    window.storage.set('diabetes-inbody', JSON.stringify(updatedInbody));
  };

  const deletePrescription = (id) => {
    const updatedPrescriptions = prescriptions.filter(p => p.id !== id);
    setPrescriptions(updatedPrescriptions);
    window.storage.set('diabetes-prescriptions', JSON.stringify(updatedPrescriptions));
  };

  const initializeGoogleAPI = () => {
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', () => {
          window.gapi.client.init({
            apiKey: 'YOUR_GOOGLE_API_KEY',
            clientId: 'YOUR_GOOGLE_CLIENT_ID',
            scope: 'https://www.googleapis.com/auth/drive.file'
          }).then(() => {
            const auth2 = window.gapi.auth2.getAuthInstance();
            auth2.isSignedIn.listen(updateSignInStatus);
            updateSignInStatus(auth2.isSignedIn.get());
          });
        });
      };
      document.body.appendChild(script);
    }
  };

  const updateSignInStatus = (isSignedIn) => {
    if (isSignedIn) {
      const profile = window.gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
      setGoogleAuth({ email: profile.getEmail() });
    } else {
      setGoogleAuth(null);
    }
  };

  const signInGoogle = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signIn();
    } catch (error) {
      console.error('Google 로그인 실패:', error);
    }
  };

  const exportToMarkdown = () => {
    let markdown = '# 당뇨 및 건강 관리 기록\n\n';
    markdown += `생성일: ${new Date().toLocaleString('ko-KR')}\n\n`;

    markdown += '## 📋 현재 복용 약물\n\n';
    if (medicines.length > 0) {
      medicines.sort((a, b) => new Date(b.prescriptionDate) - new Date(a.prescriptionDate));
      medicines.forEach(med => {
        markdown += `### ${med.name}\n- 용량: ${med.dosage}mg × ${med.frequency}회\n- 처방일: ${med.prescriptionDate}\n\n`;
      });
    } else {
      markdown += '기록 없음\n\n';
    }

    markdown += '## 💊 건강기능식품\n\n';
    if (supplements.length > 0) {
      supplements.forEach(sup => {
        markdown += `### ${sup.name}\n- 용량: ${sup.dosage} × ${sup.frequency}회\n- 시작일: ${sup.startDate}\n\n`;
      });
    } else {
      markdown += '기록 없음\n\n';
    }

    markdown += '## 🧪 혈액검사 결과\n\n';
    if (bloodTests.length > 0) {
      bloodTests.forEach(test => {
        markdown += `### ${test.testDate}\n`;
        Object.entries(test.items).forEach(([key, value]) => {
          markdown += `- ${key}: ${value}\n`;
        });
        markdown += '\n';
      });
    } else {
      markdown += '기록 없음\n\n';
    }

    markdown += '## ⚖️ 인바디 결과\n\n';
    if (inbodyRecords.length > 0) {
      inbodyRecords.forEach(record => {
        markdown += `### ${record.measureDate}\n`;
        Object.entries(record.items).forEach(([key, value]) => {
          markdown += `- ${key}: ${value}\n`;
        });
        markdown += '\n';
      });
    } else {
      markdown += '기록 없음\n\n';
    }

    markdown += '## 📊 혈당 기록\n\n';
    records.forEach(record => {
      markdown += `### ${record.date}\n`;
      markdown += `- 아침: 식전 ${record.breakfast_before}/${record.breakfast_after} 메뉴: ${record.breakfast_menu}\n`;
      markdown += `- 점심: 식전 ${record.lunch_before}/${record.lunch_after} 메뉴: ${record.lunch_menu}\n`;
      markdown += `- 저녁: 식전 ${record.dinner_before}/${record.dinner_after} 메뉴: ${record.dinner_menu}\n\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown));
    element.setAttribute('download', `diabetes_records_${new Date().toISOString().split('T')[0]}.md`);
    element.click();
  };

  const todayRecord = records.find(r => r.date === currentDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={32} />
                당뇨 & 건강 통합 관리
              </h1>
              <p className="text-gray-600 mt-1">혈당, 약물, 검사 결과 자동 분석</p>
            </div>
            <button
              onClick={exportToMarkdown}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Download size={18} />
              MD 내보내기
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['today', 'tests', 'medicines', 'stats', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab === 'today' && '오늘 기록'}
              {tab === 'tests' && '검사 결과'}
              {tab === 'medicines' && '약물'}
              {tab === 'stats' && '통계'}
              {tab === 'history' && '기록'}
            </button>
          ))}
        </div>

        {/* 오늘 기록 탭 */}
        {activeTab === 'today' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">혈당 기록 (mg/dL)</h2>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div><label className="text-sm font-semibold">아침</label>
                    <input type="number" placeholder="식전" value={formData.breakfast_before} onChange={(e) => setFormData({...formData, breakfast_before: e.target.value})} className="w-full border rounded px-2 py-1" />
                    <input type="number" placeholder="식후" value={formData.breakfast_after} onChange={(e) => setFormData({...formData, breakfast_after: e.target.value})} className="w-full border rounded px-2 py-1" />
                  </div>
                  <div><label className="text-sm font-semibold">점심</label>
                    <input type="number" placeholder="식전" value={formData.lunch_before} onChange={(e) => setFormData({...formData, lunch_before: e.target.value})} className="w-full border rounded px-2 py-1" />
                    <input type="number" placeholder="식후" value={formData.lunch_after} onChange={(e) => setFormData({...formData, lunch_after: e.target.value})} className="w-full border rounded px-2 py-1" />
                  </div>
                  <div><label className="text-sm font-semibold">저녁</label>
                    <input type="number" placeholder="식전" value={formData.dinner_before} onChange={(e) => setFormData({...formData, dinner_before: e.target.value})} className="w-full border rounded px-2 py-1" />
                    <input type="number" placeholder="식후" value={formData.dinner_after} onChange={(e) => setFormData({...formData, dinner_after: e.target.value})} className="w-full border rounded px-2 py-1" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">식사 메뉴</h2>
                <div className="space-y-2">
                  <textarea placeholder="아침 메뉴" value={formData.breakfast_menu} onChange={(e) => setFormData({...formData, breakfast_menu: e.target.value})} className="w-full border rounded px-3 py-2 h-12" />
                  <textarea placeholder="점심 메뉴" value={formData.lunch_menu} onChange={(e) => setFormData({...formData, lunch_menu: e.target.value})} className="w-full border rounded px-3 py-2 h-12" />
                  <textarea placeholder="저녁 메뉴" value={formData.dinner_menu} onChange={(e) => setFormData({...formData, dinner_menu: e.target.value})} className="w-full border rounded px-3 py-2 h-12" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">신체 증상</h2>
                <div className="space-y-2">
                  <textarea placeholder="아침 증상" value={formData.breakfast_symptoms} onChange={(e) => setFormData({...formData, breakfast_symptoms: e.target.value})} className="w-full border rounded px-3 py-2 h-12" />
                  <textarea placeholder="점심 증상" value={formData.lunch_symptoms} onChange={(e) => setFormData({...formData, lunch_symptoms: e.target.value})} className="w-full border rounded px-3 py-2 h-12" />
                  <textarea placeholder="저녁 증상" value={formData.dinner_symptoms} onChange={(e) => setFormData({...formData, dinner_symptoms: e.target.value})} className="w-full border rounded px-3 py-2 h-12" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">혈압 & 맥박</h2>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="수축압" value={formData.systolic_bp} onChange={(e) => setFormData({...formData, systolic_bp: e.target.value})} className="border rounded px-3 py-2" />
                  <input type="number" placeholder="이완압" value={formData.diastolic_bp} onChange={(e) => setFormData({...formData, diastolic_bp: e.target.value})} className="border rounded px-3 py-2" />
                  <input type="number" placeholder="맥박" value={formData.heart_rate} onChange={(e) => setFormData({...formData, heart_rate: e.target.value})} className="border rounded px-3 py-2" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">운동</h2>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="운동 종류" value={formData.exercise_type} onChange={(e) => setFormData({...formData, exercise_type: e.target.value})} className="border rounded px-3 py-2" />
                  <input type="number" placeholder="분" value={formData.exercise_duration} onChange={(e) => setFormData({...formData, exercise_duration: e.target.value})} className="border rounded px-3 py-2" />
                </div>
              </div>

              <button onClick={addRecord} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg">
                기록 저장
              </button>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
                <h2 className="text-lg font-bold text-gray-800 mb-4">오늘 요약</h2>
                {todayRecord ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">평균 혈당: <span className="text-2xl font-bold text-indigo-600">{Math.round(([todayRecord.breakfast_before, todayRecord.breakfast_after, todayRecord.lunch_before, todayRecord.lunch_after, todayRecord.dinner_before, todayRecord.dinner_after].filter(v => v).reduce((a, b) => Number(a) + Number(b), 0) / [todayRecord.breakfast_before, todayRecord.breakfast_after, todayRecord.lunch_before, todayRecord.lunch_after, todayRecord.dinner_before, todayRecord.dinner_after].filter(v => v).length) || 0)}</span></p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">오늘 기록이 없습니다</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 검사 결과 탭 */}
        {activeTab === 'tests' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 혈액검사 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🧪 혈액검사</h2>
              <textarea
                placeholder={`검사일: 2025-01-15
HbA1c: 6.8
공복혈당: 125
총콜레스테롤: 210
HDL: 45
LDL: 150
중성지방: 180
GOT: 22
GPT: 28
크레아티닌: 0.9`}
                value={bloodTestText}
                onChange={(e) => setBloodTestText(e.target.value)}
                className="w-full border rounded px-3 py-2 h-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <button onClick={saveBloodTest} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">
                저장
              </button>

              <div className="mt-6">
                <h3 className="font-bold mb-3">저장된 검사</h3>
                {bloodTests.map(test => (
                  <div key={test.id} className="border rounded p-3 mb-2 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{test.testDate}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          {Object.entries(test.items).map(([k, v]) => (
                            <p key={k}>{k}: {v}</p>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => deleteBloodTest(test.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 인바디 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">⚖️ 인바디</h2>
              <textarea
                placeholder={`측정일: 2025-01-15
체중: 75.5
체지방률: 28.5
근육량: 52.3
기초대사량: 1650
BMI: 24.5`}
                value={inbodyText}
                onChange={(e) => setInbodyText(e.target.value)}
                className="w-full border rounded px-3 py-2 h-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <button onClick={saveInbody} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">
                저장
              </button>

              <div className="mt-6">
                <h3 className="font-bold mb-3">저장된 측정</h3>
                {inbodyRecords.map(record => (
                  <div key={record.id} className="border rounded p-3 mb-2 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{record.measureDate}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          {Object.entries(record.items).map(([k, v]) => (
                            <p key={k}>{k}: {v}</p>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => deleteInbody(record.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 약 처방전 */}
            <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-800 mb-4">💊 약 처방전</h2>
              <textarea
                placeholder={`처방일: 2025-01-15
- 메트포르민, 500mg × 2회
- 글리피지드, 5mg × 2회
- 리피토르, 10mg × 1회`}
                value={prescriptionText}
                onChange={(e) => setPrescriptionText(e.target.value)}
                className="w-full border rounded px-3 py-2 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <button onClick={savePrescription} className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded">
                저장 및 약물에 추가
              </button>

              <div className="mt-6">
                <h3 className="font-bold mb-3">처방 이력</h3>
                {prescriptions.map(rx => (
                  <div key={rx.id} className="border rounded p-3 mb-2 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{rx.prescriptionDate}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          {rx.medicines.map((med, idx) => (
                            <p key={idx}>{med.name} {med.dosage}mg × {med.frequency}회</p>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => deletePrescription(rx.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 약물 탭 */}
        {activeTab === 'medicines' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">약물 추가</h2>
                <div className="space-y-3">
                  <input type="text" placeholder="약물명" value={newMedicine.name} onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})} className="w-full border rounded px-3 py-2" />
                  <input type="number" placeholder="용량 (mg)" value={newMedicine.dosage} onChange={(e) => setNewMedicine({...newMedicine, dosage: e.target.value})} className="w-full border rounded px-3 py-2" />
                  <select value={newMedicine.frequency} onChange={(e) => setNewMedicine({...newMedicine, frequency: e.target.value})} className="w-full border rounded px-3 py-2">
                    <option value="">복용 횟수</option>
                    <option value="1">1회</option>
                    <option value="2">2회</option>
                    <option value="3">3회</option>
                  </select>
                  <input type="date" value={newMedicine.prescriptionDate} onChange={(e) => setNewMedicine({...newMedicine, prescriptionDate: e.target.value})} className="w-full border rounded px-3 py-2" />
                  <button onClick={addMedicine} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded">
                    추가
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">현재 약물</h2>
                {medicines.map(med => (
                  <div key={med.id} className="border rounded p-3 mb-2 bg-gray-50 flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{med.name}</p>
                      <p className="text-sm text-gray-600">{med.dosage}mg × {med.frequency}회 (강도: {med.strength})</p>
                    </div>
                    <button onClick={() => deleteMedicine(med.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 통계 탭 - 간단 버전 */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 통계</h2>
            <p className="text-gray-600">혈액검사, 인바디, 혈당 데이터가 누적되면 차트가 생성됩니다.</p>
            
            {bloodTests.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-4">HbA1c 추이</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bloodTests.sort((a, b) => new Date(a.testDate) - new Date(b.testDate))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="testDate" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="items.HbA1c" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* 기록 조회 탭 */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📅 기록 조회</h2>
            <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="border rounded px-3 py-2 mb-4" />
            
            {records.length > 0 ? (
              records.map(record => (
                <div key={record.id} className="border rounded p-4 mb-4 bg-gray-50">
                  <h3 className="font-bold text-lg mb-2">{record.date}</h3>
                  <p>아침: {record.breakfast_before}/{record.breakfast_after} - {record.breakfast_menu}</p>
                  <p>점심: {record.lunch_before}/{record.lunch_after} - {record.lunch_menu}</p>
                  <p>저녁: {record.dinner_before}/{record.dinner_after} - {record.dinner_menu}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">기록이 없습니다</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiabetesTracker;
