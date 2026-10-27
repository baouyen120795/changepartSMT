import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Cpu,
  Layers,
  Activity,
  FileSpreadsheet,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Boxes,
  Database,
  RefreshCw,
  Trash2,
  X,
  ChevronRight,
  Download,
  HardDrive,
  Filter,
  Check,
  PackagePlus,
  Calendar,
  User,
  Info,
  Server,
  FolderSync,
  ChevronLeft
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('equipments'); // 'dashboard', 'equipments', 'maintenance', 'parts', 'schema'

  // Data State
  const [equipments, setEquipments] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [equipPage, setEquipPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const pageSize = 20;

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(null); // part object
  const [selectedEquipDetail, setSelectedEquipDetail] = useState(null); // equip object

  // Form State for Log Modal
  const [logForm, setLogForm] = useState({
    equipment_id: '',
    part_id: '',
    quantity_used: 1,
    failure_reason: '',
    technician_name: '',
    notes: '',
    replaced_date: new Date().toISOString().substring(0, 16).replace('T', ' ')
  });

  // Form State for Equipment Modal
  const [equipForm, setEquipForm] = useState({
    equipment_code: '',
    equipment_name: '',
    category: 'MOUNTER',
    line_name: 'Line 1',
    model: '',
    serial_number: '',
    installation_date: new Date().toISOString().substring(0, 10),
    status: 'Running'
  });

  // Form State for Spare Part Modal
  const [partForm, setPartForm] = useState({
    part_number: '',
    part_name: '',
    category: 'Nozzle',
    stock_quantity: 10,
    min_stock_alert: 5
  });

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [eqRes, logRes, partRes, statsRes] = await Promise.all([
        fetch('/api/equipments'),
        fetch('/api/maintenance'),
        fetch('/api/spare-parts'),
        fetch('/api/stats')
      ]);

      if (eqRes.ok) setEquipments(await eqRes.json());
      if (logRes.ok) setMaintenanceLogs(await logRes.json());
      if (partRes.ok) setSpareParts(await partRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Lỗi kết nối máy chủ backend!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync data from Excel files
  const handleSyncExcel = async () => {
    setSyncing(true);
    showToast('Đang quét và đồng bộ dữ liệu từ tất cả file Excel...', 'info');
    try {
      const res = await fetch('/api/import-excel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Đồng bộ từ Excel thành công!');
        await loadData();
      } else {
        showToast(data.error || 'Lỗi đồng bộ', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối khi đồng bộ', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Filtered Equipments
  const filteredEquipments = equipments.filter(eq => {
    const matchCat = selectedCategory === 'ALL' || eq.category === selectedCategory;
    const matchLine = selectedLine === 'ALL' ||
      (selectedLine.includes('-')
        ? eq.line_name === selectedLine
        : (eq.line_name === selectedLine || eq.line_name?.startsWith(selectedLine + '-')));
    const matchStatus = selectedStatus === 'ALL' || eq.status === selectedStatus;
    const matchSearch = !searchQuery || 
      eq.equipment_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.equipment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eq.model && eq.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (eq.serial_number && eq.serial_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (eq.asset_no && eq.asset_no.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCat && matchLine && matchStatus && matchSearch;
  });

  // Filtered Maintenance Logs
  const filteredLogs = maintenanceLogs.filter(log => {
    const matchCat = selectedCategory === 'ALL' || log.equipment_category === selectedCategory;
    const matchLine = selectedLine === 'ALL' ||
      (selectedLine.includes('-')
        ? log.line_name === selectedLine
        : (log.line_name === selectedLine || log.line_name?.startsWith(selectedLine + '-')));
    const matchSearch = !searchQuery ||
      log.equipment_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.equipment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.part_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.technician_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.failure_reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source_file?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCat && matchLine && matchSearch;
  });

  // Paginated slices
  const equipTotalPages = Math.ceil(filteredEquipments.length / pageSize) || 1;
  const paginatedEquipments = filteredEquipments.slice((equipPage - 1) * pageSize, equipPage * pageSize);

  const logTotalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((logPage - 1) * pageSize, logPage * pageSize);

  // Reset pagination when filter changes
  useEffect(() => {
    setEquipPage(1);
    setLogPage(1);
  }, [selectedCategory, selectedLine, selectedStatus, searchQuery]);

  // Export Excel handler
  const handleExportExcel = () => {
    let url = '/api/maintenance/export-excel';
    const params = new URLSearchParams();
    if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
    if (selectedLine !== 'ALL') params.append('line', selectedLine);
    if (params.toString()) url += `?${params.toString()}`;

    window.open(url, '_blank');
    showToast('Đang tạo và tải xuống báo cáo Excel...', 'info');
  };

  // Submit Maintenance Log
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!logForm.equipment_id || !logForm.technician_name || !logForm.quantity_used) {
      showToast('Vui lòng điền đầy đủ các trường bắt buộc!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Đã ghi nhận thay thế linh kiện thành công!');
        setShowLogModal(false);
        setLogForm({
          equipment_id: '',
          part_id: '',
          quantity_used: 1,
          failure_reason: '',
          technician_name: '',
          notes: '',
          replaced_date: new Date().toISOString().substring(0, 16).replace('T', ' ')
        });
        loadData();
      } else {
        showToast(data.error || 'Có lỗi xảy ra', 'error');
      }
    } catch (err) {
      showToast('Không thể gửi yêu cầu', 'error');
    }
  };

  // Submit New Equipment
  const handleEquipSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/equipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Thêm thiết bị mới thành công!');
        setShowEquipModal(false);
        setEquipForm({
          equipment_code: '',
          equipment_name: '',
          category: 'MOUNTER',
          line_name: 'Line 1',
          model: '',
          serial_number: '',
          installation_date: new Date().toISOString().substring(0, 10),
          status: 'Running'
        });
        loadData();
      } else {
        showToast(data.error || 'Lỗi thêm thiết bị', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  // Update Equipment Status
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/equipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Đã chuyển trạng thái sang ${newStatus}`);
        loadData();
      }
    } catch (err) {
      showToast('Lỗi cập nhật trạng thái', 'error');
    }
  };

  // Submit New Spare Part
  const handlePartSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Thêm linh kiện mới vào kho thành công!');
        setShowPartModal(false);
        setPartForm({
          part_number: '',
          part_name: '',
          category: 'Nozzle',
          stock_quantity: 10,
          min_stock_alert: 5
        });
        loadData();
      } else {
        showToast(data.error || 'Lỗi thêm linh kiện', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  // Quick Restock
  const handleRestock = async (e) => {
    e.preventDefault();
    const qty = parseInt(e.target.add_stock.value, 10);
    if (!qty || qty <= 0) return;

    try {
      const res = await fetch(`/api/spare-parts/${showRestockModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_stock: qty })
      });
      if (res.ok) {
        showToast(`Đã nhập thêm +${qty} linh kiện vào kho!`);
        setShowRestockModal(null);
        loadData();
      }
    } catch (err) {
      showToast('Lỗi nhập kho', 'error');
    }
  };

  // Delete Maintenance Log
  const handleDeleteLog = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi bảo dưỡng này?')) return;
    try {
      const res = await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Đã xóa bản ghi lịch sử');
        loadData();
      }
    } catch (err) {
      showToast('Lỗi xóa bản ghi', 'error');
    }
  };

  // Open detail history modal for an equipment
  const openEquipmentHistory = async (eq) => {
    try {
      const res = await fetch(`/api/equipments/${eq.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEquipDetail(data);
      } else {
        setSelectedEquipDetail({ equipment: eq, maintenance_history: [] });
      }
    } catch (err) {
      setSelectedEquipDetail({ equipment: eq, maintenance_history: [] });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-lg shadow-xl text-white font-medium flex items-center gap-3 transition-all transform animate-bounce ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-inner">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-white">SMT FACTORY MAINTENANCE</h1>
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded font-mono font-semibold">
                    {maintenanceLogs.length} Records Loaded
                  </span>
                </div>
                <p className="text-xs text-slate-400">Hệ thống Quản lý Thiết bị & Lịch sử Thay Thế Linh Kiện SMT</p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2">
              {/* Nút Đồng Bộ Từ Excel */}
              <button
                onClick={handleSyncExcel}
                disabled={syncing}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                title="Quét lại các file Excel trong thư mục và đồng bộ vào hệ thống"
              >
                <FolderSync className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Excel'}</span>
              </button>

              <button
                onClick={() => {
                  setLogForm(prev => ({
                    ...prev,
                    equipment_id: equipments[0]?.id || '',
                    part_id: spareParts[0]?.id || '',
                    quantity_used: 1,
                    technician_name: 'Nguyễn Văn A'
                  }));
                  setShowLogModal(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Ghi Nhận Thay Part</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={loadData}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 overflow-x-auto border-t border-slate-800/80 pt-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              Tổng Quan (Dashboard)
            </button>

            <button
              onClick={() => setActiveTab('equipments')}
              className={`px-4 py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'equipments'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Thiết Bị SMT ({equipments.length})
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'maintenance'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Lịch Sử Thay Thế ({maintenanceLogs.length})
            </button>

            <button
              onClick={() => setActiveTab('parts')}
              className={`px-4 py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'parts'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              Kho Linh Kiện ({spareParts.length})
              {stats?.totals?.low_stock_parts > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-900 text-xs rounded-full font-bold">
                  {stats.totals.low_stock_parts}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('schema')}
              className={`px-4 py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'schema'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4" />
              Cơ Sở Dữ Liệu (Schema SQL)
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: TỔNG QUAN DASHBOARD                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Sync from Excel Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Dữ Liệu Thực Tế Từ Các Thư Mục SMT</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Đã nhập toàn bộ {maintenanceLogs.length} lịch sử thay thế và {equipments.length} máy móc từ Mounter, Printer, Laser, Bonding, Reflow, Buffer, Auto Label.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSyncExcel}
                disabled={syncing}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow transition whitespace-nowrap flex items-center gap-1.5"
              >
                <FolderSync className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Lại Từ Excel'}
              </button>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Equipments */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Thiết Bị</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">{equipments.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Line 1 đến Line 6</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Cpu className="w-6 h-6" />
                </div>
              </div>

              {/* Running */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Đang Chạy (Running)</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats?.totals?.running || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Hoạt động bình thường</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
              </div>

              {/* Maintenance */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Đang Bảo Trì</p>
                  <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats?.totals?.maintenance || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Đang PM hoặc sửa chữa</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>

              {/* Low Stock Parts */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Cảnh Báo Tồn Kho</p>
                  <p className="text-3xl font-extrabold text-red-600 mt-1">{stats?.totals?.low_stock_parts || 0}</p>
                  <p className="text-xs text-red-500 mt-1">Linh kiện dưới mức tối thiểu</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              {/* Maintenance Events */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Lịch Sử Thay Part</p>
                  <p className="text-3xl font-extrabold text-indigo-600 mt-1">{maintenanceLogs.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Bản ghi từ các file Excel</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Middle Section: Breakdown by Category & Low Stock Alert List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Phân Bổ Thiết Bị Theo Chủng Loại SMT
                </h3>
                <div className="space-y-3">
                  {stats?.categories?.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        <span className="font-semibold text-sm text-slate-700">{cat.category.replace('_', ' ')}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                        {cat.count} máy
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock Items Alert Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Linh Kiện Cần Nhập Thêm (Gấp)
                  </h3>
                  <button 
                    onClick={() => setActiveTab('parts')}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Xem tất cả ({spareParts.length}) &rarr;
                  </button>
                </div>

                {stats?.low_stock_items?.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm">Tất cả linh kiện đang đủ tồn kho an toàn</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats?.low_stock_items?.map((item) => (
                      <div key={item.id} className="p-3 bg-red-50/60 border border-red-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-red-800">{item.part_number}</span>
                            <span className="text-xs px-1.5 py-0.2 bg-white text-slate-600 border border-slate-200 rounded">{item.category}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 mt-0.5 line-clamp-1">{item.part_name}</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Hiện có: <strong>{item.stock_quantity}</strong> / Tối thiểu: <strong>{item.min_stock_alert}</strong>
                          </p>
                        </div>
                        <button
                          onClick={() => setShowRestockModal(item)}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium shadow-sm transition whitespace-nowrap"
                        >
                          + Nhập
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Maintenance Feed */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Thay Thế Gần Đây Nhất
                  </h3>
                  <button 
                    onClick={() => setActiveTab('maintenance')}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Xem tất cả &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  {maintenanceLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span className="font-mono font-bold text-blue-700">{log.equipment_code}</span>
                        <span>{log.replaced_date ? log.replaced_date.substring(0, 10) : ''}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                        {log.part_name || log.part_number || 'Linh kiện'} <span className="text-blue-600 font-normal">x{log.quantity_used}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        Lý do: {log.failure_reason || 'Bảo dưỡng định kỳ'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">PIC: {log.technician_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: QUẢN LÝ THIẾT BỊ SMT (EQUIPMENTS)                       */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'equipments' && (
          <div className="space-y-5">
            {/* Action Bar & Filter Header */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Danh Sách Thiết Bị SMT ({filteredEquipments.length} máy)</h2>
                  <p className="text-sm text-slate-500">
                    Mounter (Máy gắp), Printer (In thiếc), Auto Labeler, Buffer Conveyor, Reflow, Laser, Bonding
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEquipModal(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Thiết Bị
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    📥 Xuất Báo Cáo Excel
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {/* Category Filter Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 mr-1">
                    <Filter className="w-3.5 h-3.5" /> Chủng loại:
                  </span>
                  {['ALL', 'MOUNTER', 'PRINTER', 'AUTO_LABEL', 'BUFFER_CONVEYOR', 'REFLOW', 'LASER_MARKING', 'BONDING'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Second row: Line Filter & Search */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {/* Line filter */}
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Chuyền (Line):</span>
                    {['ALL', 'Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6', 'PM ROOM'].map((ln) => (
                      <button
                        key={ln}
                        onClick={() => setSelectedLine(ln)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                          selectedLine === ln
                            ? 'bg-slate-800 text-white font-semibold'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {ln}
                      </button>
                    ))}
                  </div>

                  {/* Status & Search */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="Running">Đang chạy (Running)</option>
                      <option value="Maintenance">Đang bảo trì</option>
                      <option value="Stopped">Tạm dừng (Stopped)</option>
                    </select>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm mã máy, tên máy, serial..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-56 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bảng hiển thị danh sách thiết bị */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Mã Máy</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Tên Thiết Bị</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Phân Loại</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Chuyền (Line)</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Model / Serial</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng Thái</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedEquipments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">
                          Không tìm thấy thiết bị nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      paginatedEquipments.map((eq) => (
                        <tr key={eq.id} className="hover:bg-slate-50/80 transition">
                          {/* Mã Máy */}
                          <td className="p-4 text-sm font-bold text-blue-900 font-mono">
                            {eq.equipment_code}
                          </td>

                          {/* Tên Thiết Bị */}
                          <td className="p-4 text-sm font-medium text-slate-800">
                            {eq.equipment_name}
                          </td>

                          {/* Phân Loại */}
                          <td className="p-4 text-sm">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">
                              {eq.category}
                            </span>
                          </td>

                          {/* Chuyền (Line) */}
                          <td className="p-4 text-sm text-slate-700 font-medium">
                            {eq.line_name}
                          </td>

                          {/* Model / Serial */}
                          <td className="p-4 text-xs text-slate-500 font-mono">
                            <div>{eq.model || '-'}</div>
                            <div className="text-[11px] text-slate-400">{eq.serial_number || ''}</div>
                          </td>

                          {/* Trạng Thái */}
                          <td className="p-4 text-sm">
                            <select
                              value={eq.status}
                              onChange={(e) => handleStatusChange(eq.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer focus:ring-1 focus:ring-blue-500 ${
                                eq.status === 'Running'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : eq.status === 'Maintenance'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <option value="Running">Running</option>
                              <option value="Maintenance">Maintenance</option>
                              <option value="Stopped">Stopped</option>
                            </select>
                          </td>

                          {/* Hành Động */}
                          <td className="p-4 text-sm text-right space-x-2">
                            <button
                              onClick={() => {
                                setLogForm(prev => ({
                                  ...prev,
                                  equipment_id: eq.id,
                                  part_id: spareParts[0]?.id || '',
                                  technician_name: 'Nguyễn Văn A'
                                }));
                                setShowLogModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-200 rounded text-xs font-medium transition"
                            >
                              + Thay Part
                            </button>
                            <button
                              onClick={() => openEquipmentHistory(eq)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-xs transition"
                            >
                              Xem Lịch Sử Thay Thế &rarr;
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {equipTotalPages > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Hiển thị <strong>{(equipPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(equipPage * pageSize, filteredEquipments.length)}</strong> trong số <strong>{filteredEquipments.length}</strong> thiết bị
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEquipPage(p => Math.max(1, p - 1))}
                      disabled={equipPage === 1}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Trước
                    </button>
                    <span className="px-3 py-1 font-bold text-slate-800">
                      Trang {equipPage} / {equipTotalPages}
                    </span>
                    <button
                      onClick={() => setEquipPage(p => Math.min(equipTotalPages, p + 1))}
                      disabled={equipPage === equipTotalPages}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 font-medium"
                    >
                      Sau <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: LỊCH SỬ THAY THẾ (MAINTENANCE LOGS)                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'maintenance' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Nhật Ký Bảo Dưỡng & Thay Thế Linh Kiện ({filteredLogs.length} bản ghi)
                </h2>
                <p className="text-sm text-slate-500">
                  Toàn bộ dữ liệu tổng hợp từ các file Excel: Mounter, Printer, Reflow, Laser, Bonding, Buffer...
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncExcel}
                  disabled={syncing}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <FolderSync className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Đồng Bộ Excel</span>
                </button>

                <button
                  onClick={() => setShowLogModal(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Ghi Nhận Thay Thế Mới
                </button>

                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  📥 Xuất Excel
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Lọc theo:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
                >
                  <option value="ALL">Tất cả chủng loại</option>
                  <option value="MOUNTER">Mounter</option>
                  <option value="PRINTER">Printer</option>
                  <option value="AUTO_LABEL">Auto Labeler</option>
                  <option value="BUFFER_CONVEYOR">Buffer Conveyor</option>
                  <option value="REFLOW">Reflow</option>
                  <option value="LASER_MARKING">Laser Marking</option>
                  <option value="BONDING">Bonding</option>
                </select>

                <select
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
                >
                  <option value="ALL">Tất cả các Line</option>
                  <option value="Line 1">Line 1</option>
                  <option value="Line 2">Line 2</option>
                  <option value="Line 3">Line 3</option>
                  <option value="Line 4">Line 4</option>
                  <option value="Line 5">Line 5</option>
                  <option value="Line 6">Line 6</option>
                  <option value="PM ROOM">PM ROOM</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm linh kiện, mã part, PIC, máy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bảng Lịch Sử Thay Thế */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase">Thời Gian</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase">Mã & Tên Máy</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase">Chuyền</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase">Linh Kiện Thay Thế</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase">Mã Part</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase text-center">SL</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase">Nguyên Nhân / Ghi Chú</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase">Kỹ Thuật Viên</th>
                      <th className="p-3 text-xs font-bold text-slate-600 uppercase text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="p-8 text-center text-slate-400">
                          Chưa có bản ghi lịch sử thay thế nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition text-sm">
                          <td className="p-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                            {log.replaced_date ? log.replaced_date.substring(0, 10) : '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-blue-900 font-mono text-xs">{log.equipment_code}</span>
                              {log.serial_number && (
                                <span className="font-mono text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-semibold">
                                  SN: {log.serial_number}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-700 truncate max-w-xs">{log.equipment_name}</div>
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                            {log.line_name}
                          </td>
                          <td className="p-3 font-medium text-slate-800 max-w-xs">
                            <div className="line-clamp-2">{log.part_name || 'Linh kiện'}</div>
                          </td>
                          <td className="p-3 text-xs font-mono text-blue-800 font-semibold">
                            {log.part_number || '-'}
                          </td>
                          <td className="p-3 text-center font-bold text-blue-600">
                            {log.quantity_used}
                          </td>
                          <td className="p-3 text-xs text-slate-700 max-w-sm">
                            <div className="font-medium text-slate-900">{log.failure_reason || '-'}</div>
                            {log.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{log.notes}</div>}
                            {log.source_file && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono">
                                  📁 {log.source_file.replace('.xlsx', '')}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {log.technician_name}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Xóa bản ghi này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {logTotalPages > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Hiển thị <strong>{(logPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(logPage * pageSize, filteredLogs.length)}</strong> trong số <strong>{filteredLogs.length}</strong> bản ghi bảo dưỡng
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLogPage(p => Math.max(1, p - 1))}
                      disabled={logPage === 1}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Trước
                    </button>
                    <span className="px-3 py-1 font-bold text-slate-800">
                      Trang {logPage} / {logTotalPages}
                    </span>
                    <button
                      onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))}
                      disabled={logPage === logTotalPages}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 font-medium"
                    >
                      Sau <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: KHO LINH KIỆN (SPARE PARTS INVENTORY)                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'parts' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Quản Lý Kho Linh Kiện ({spareParts.length} loại phụ tùng)
                </h2>
                <p className="text-sm text-slate-500">
                  Theo dõi số lượng tồn kho phụ tùng SMT, cảnh báo tự động khi số lượng thấp hơn định mức tối thiểu
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPartModal(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Thêm Linh Kiện Mới
                </button>
              </div>
            </div>

            {/* Spare Parts Grid / Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase">Mã Part (Part Number)</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase">Tên Linh Kiện</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase">Chủng Loại</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase text-center">Tồn Kho Hiện Tại</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase text-center">Định Mức Tối Thiểu</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase">Trạng Thái Kho</th>
                      <th className="p-4 text-xs font-bold text-slate-600 uppercase text-right">Nhập Thêm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {spareParts.map((part) => {
                      const isLow = part.stock_quantity <= part.min_stock_alert;
                      return (
                        <tr key={part.id} className={`hover:bg-slate-50/80 transition ${isLow ? 'bg-red-50/20' : ''}`}>
                          <td className="p-4 font-mono font-bold text-blue-900 text-sm">
                            {part.part_number}
                          </td>
                          <td className="p-4 font-medium text-slate-800 text-sm">
                            {part.part_name}
                          </td>
                          <td className="p-4 text-sm">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium">
                              {part.category || 'General'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-base font-bold font-mono ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                              {part.stock_quantity}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono text-sm text-slate-500">
                            {part.min_stock_alert}
                          </td>
                          <td className="p-4">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" /> Sắp hết - Cần nhập
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                <Check className="w-3.5 h-3.5" /> Đủ tồn an toàn
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setShowRestockModal(part)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition"
                            >
                              + Nhập Kho
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: DATABASE SCHEMA SQL                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'schema' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-6 h-6 text-blue-600" />
                  Cơ Sở Dữ Liệu SMT (PostgreSQL / MySQL / SQLite)
                </h2>
                <p className="text-sm text-slate-500">
                  Cấu trúc DDL 3 bảng chính: `equipments`, `spare_parts`, `maintenance_logs` theo đúng đặc tả kỹ thuật.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncExcel}
                  disabled={syncing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition"
                >
                  <FolderSync className="w-4 h-4" />
                  Quét Lại File Excel
                </button>

                <a
                  href="/database/schema.sql"
                  download="schema.sql"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition"
                >
                  <Download className="w-4 h-4" />
                  Tải File schema.sql
                </a>
              </div>
            </div>

            {/* Code Block Display */}
            <div className="bg-slate-900 rounded-xl p-5 text-slate-200 shadow-xl overflow-x-auto font-mono text-xs leading-relaxed border border-slate-800">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
                <span>SQL DDL Schema definition</span>
                <span className="text-emerald-400">● 457 Records in Database</span>
              </div>
              <pre>{`-- 1. Bảng danh mục thiết bị SMT
CREATE TABLE equipments (
    id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(50) UNIQUE NOT NULL, -- Ví dụ: MNT-Line1-01
    equipment_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,              -- 'MOUNTER', 'PRINTER', 'AUTO_LABEL', 'BUFFER_CONVEYOR'
    line_name VARCHAR(50) NOT NULL,             -- Line 1, Line 2...
    model VARCHAR(50),
    serial_number VARCHAR(50),
    installation_date DATE,
    status VARCHAR(20) DEFAULT 'Running',       -- 'Running', 'Maintenance', 'Stopped'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng danh mục linh kiện (Spare Parts)
CREATE TABLE spare_parts (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(50) UNIQUE NOT NULL,
    part_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    stock_quantity INT DEFAULT 0,
    min_stock_alert INT DEFAULT 5
);

-- 3. Bảng lịch sử thay thế linh kiện (Maintenance & Replacement History)
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    equipment_id INT REFERENCES equipments(id) ON DELETE CASCADE,
    part_id INT REFERENCES spare_parts(id),
    quantity_used INT NOT NULL,
    replaced_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failure_reason TEXT,
    technician_name VARCHAR(100) NOT NULL,
    notes TEXT
);`}</pre>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: GHI NHẬN THAY THẾ LINH KIỆN                          */}
      {/* ------------------------------------------------------------- */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Ghi Nhận Lịch Sử Thay Thế Linh Kiện</h3>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-4 mt-4">
              {/* Chọn Thiết Bị */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Thiết Bị SMT <span className="text-red-500">*</span>
                </label>
                <select
                  value={logForm.equipment_id}
                  onChange={(e) => setLogForm({ ...logForm, equipment_id: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Chọn máy cần thay thế linh kiện --</option>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.line_name}] {eq.equipment_code} - {eq.equipment_name} ({eq.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Linh Kiện & Số Lượng */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Linh Kiện Từ Kho <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={logForm.part_id}
                    onChange={(e) => setLogForm({ ...logForm, part_id: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Chọn linh kiện thay thế --</option>
                    {spareParts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.part_number} - {p.part_name} (Tồn: {p.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Số Lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={logForm.quantity_used}
                    onChange={(e) => setLogForm({ ...logForm, quantity_used: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 text-center font-bold"
                    required
                  />
                </div>
              </div>

              {/* Kỹ Thuật Viên & Thời Gian */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kỹ Thuật Viên (PIC) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A, N.V.Giang, N.Đ.Tiệp..."
                    value={logForm.technician_name}
                    onChange={(e) => setLogForm({ ...logForm, technician_name: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Thời Gian Thay Thế
                  </label>
                  <input
                    type="text"
                    value={logForm.replaced_date}
                    onChange={(e) => setLogForm({ ...logForm, replaced_date: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Nguyên Nhân Hỏng Hóc */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nguyên Nhân Hỏng Hóc
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Mòn đầu hút', 'Đứt dây đai belt', 'Hỏng van vacuum', 'Sensor chập chờn', 'Kẹt vòng bi', 'Bảo trì PM định kỳ'].map((reason) => (
                    <button
                      type="button"
                      key={reason}
                      onClick={() => setLogForm({ ...logForm, failure_reason: reason })}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs transition"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Mô tả nguyên nhân hỏng hóc..."
                  value={logForm.failure_reason}
                  onChange={(e) => setLogForm({ ...logForm, failure_reason: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ghi Chú & Kết Quả */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi Chú & Kết Quả Sau Thay Thế
                </label>
                <textarea
                  rows="2"
                  placeholder="Ghi chú thao tác, kết quả kiểm tra test CPK hoặc chạy thử mạch..."
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-100 font-medium transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Lưu Lịch Sử & Cập Nhật Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: THÊM THIẾT BỊ MỚI                                    */}
      {/* ------------------------------------------------------------- */}
      {showEquipModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Thêm Thiết Bị SMT Mới
              </h3>
              <button onClick={() => setShowEquipModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEquipSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mã Thiết Bị (Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: MNT-L1-03"
                    value={equipForm.equipment_code}
                    onChange={(e) => setEquipForm({ ...equipForm, equipment_code: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chuyền (Line) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={equipForm.line_name}
                    onChange={(e) => setEquipForm({ ...equipForm, line_name: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="Line 1">Line 1</option>
                    <option value="Line 2">Line 2</option>
                    <option value="Line 3">Line 3</option>
                    <option value="Line 4">Line 4</option>
                    <option value="Line 5">Line 5</option>
                    <option value="Line 6">Line 6</option>
                    <option value="PM ROOM">PM ROOM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên Thiết Bị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Panasonic NPM Mounter, DEK Printer..."
                  value={equipForm.equipment_name}
                  onChange={(e) => setEquipForm({ ...equipForm, equipment_name: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Phân Loại SMT <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={equipForm.category}
                    onChange={(e) => setEquipForm({ ...equipForm, category: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="MOUNTER">MOUNTER (Máy gắp)</option>
                    <option value="PRINTER">PRINTER (Máy in thiếc)</option>
                    <option value="AUTO_LABEL">AUTO_LABEL (Dán nhãn)</option>
                    <option value="BUFFER_CONVEYOR">BUFFER_CONVEYOR</option>
                    <option value="REFLOW">REFLOW (Lò hàn)</option>
                    <option value="LASER_MARKING">LASER_MARKING</option>
                    <option value="BONDING">BONDING</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Trạng Thái Ban Đầu
                  </label>
                  <select
                    value={equipForm.status}
                    onChange={(e) => setEquipForm({ ...equipForm, status: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="Running">Running (Đang chạy)</option>
                    <option value="Maintenance">Maintenance (Bảo dưỡng)</option>
                    <option value="Stopped">Stopped (Tạm dừng)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="VD: NPM-D3, SVL-200..."
                    value={equipForm.model}
                    onChange={(e) => setEquipForm({ ...equipForm, model: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="VD: 1CQV2620, SVL-LRF-4015..."
                    value={equipForm.serial_number}
                    onChange={(e) => setEquipForm({ ...equipForm, serial_number: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEquipModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-100 font-medium transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Thêm Thiết Bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: XEM CHI TIẾT & LỊCH SỬ CỦA 1 THIẾT BỊ                 */}
      {/* ------------------------------------------------------------- */}
      {selectedEquipDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-up max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-blue-900">
                    {selectedEquipDetail.equipment?.equipment_code}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                    {selectedEquipDetail.equipment?.category}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded">
                    {selectedEquipDetail.equipment?.line_name}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-800 mt-1">
                  {selectedEquipDetail.equipment?.equipment_name}
                </h3>
              </div>
              <button onClick={() => setSelectedEquipDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông số kỹ thuật */}
            <div className="grid grid-cols-3 gap-3 my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Model:</span>
                <p className="font-bold text-slate-800">{selectedEquipDetail.equipment?.model || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500">Serial No:</span>
                <p className="font-bold text-slate-800 font-mono">{selectedEquipDetail.equipment?.serial_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500">Trạng thái:</span>
                <p className="font-bold text-emerald-600">{selectedEquipDetail.equipment?.status || 'Running'}</p>
              </div>
            </div>

            {/* Danh sách các lần thay thế */}
            <div className="flex-1 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Lịch Sử Các Lần Thay Thế Linh Kiện ({selectedEquipDetail.maintenance_history?.length || 0})
              </h4>

              {selectedEquipDetail.maintenance_history?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Chưa có lần thay thế linh kiện nào được ghi nhận cho thiết bị này.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEquipDetail.maintenance_history?.map((item) => (
                    <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-mono text-slate-500">
                          {item.replaced_date ? item.replaced_date.substring(0, 10) : ''}
                        </span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          PIC: {item.technician_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{item.part_name || 'Linh kiện'}</span>
                        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                          {item.part_number}
                        </span>
                        <span className="text-xs font-bold text-blue-600">x{item.quantity_used}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Nguyên nhân / Chi tiết:</strong> {item.failure_reason || '-'}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-slate-500 italic mt-0.5">
                          <strong>Ghi chú:</strong> {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end mt-4">
              <button
                onClick={() => setSelectedEquipDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: THÊM LINH KIỆN MỚI                                   */}
      {/* ------------------------------------------------------------- */}
      {showPartModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                Thêm Linh Kiện Vào Kho
              </h3>
              <button onClick={() => setShowPartModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePartSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mã Part Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: NZ-9921, SY3120-6LZ-M5..."
                  value={partForm.part_number}
                  onChange={(e) => setPartForm({ ...partForm, part_number: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên Linh Kiện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Đầu hút Nozzle S-05, Solenoid Valve..."
                  value={partForm.part_name}
                  onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Phân Loại Linh Kiện
                </label>
                <select
                  value={partForm.category}
                  onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                >
                  <option value="Nozzle">Nozzle (Đầu hút)</option>
                  <option value="Belt">Belt (Dây curoa / đai)</option>
                  <option value="Valve">Valve (Van khí nén / vacuum)</option>
                  <option value="Sensor">Sensor (Cảm biến quang / tiệm cận)</option>
                  <option value="Filter">Filter (Bộ lọc khí / dầu)</option>
                  <option value="Bearing">Bearing (Vòng bi)</option>
                  <option value="Pump">Pump (Bơm vacuum)</option>
                  <option value="Motor">Motor (Động cơ)</option>
                  <option value="Chain">Chain (Xích tải lò Reflow)</option>
                  <option value="Mechanical">Mechanical (Cơ khí / Pittong)</option>
                  <option value="General">Khác (General)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Số Lượng Tồn Ban Đầu
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={partForm.stock_quantity}
                    onChange={(e) => setPartForm({ ...partForm, stock_quantity: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mức Báo Động Tối Thiểu
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={partForm.min_stock_alert}
                    onChange={(e) => setPartForm({ ...partForm, min_stock_alert: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 text-center font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPartModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-100 font-medium transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Thêm Linh Kiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: NHẬP THÊM KHO (RESTOCK MODAL)                         */}
      {/* ------------------------------------------------------------- */}
      {showRestockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
                Nhập Thêm Linh Kiện
              </h3>
              <button onClick={() => setShowRestockModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestock} className="space-y-4 mt-4">
              <div>
                <p className="text-xs font-mono font-bold text-blue-700">{showRestockModal.part_number}</p>
                <p className="text-sm font-semibold text-slate-800">{showRestockModal.part_name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tồn kho hiện tại: <strong className="text-slate-900">{showRestockModal.stock_quantity}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Số Lượng Nhập Thêm (+)
                </label>
                <input
                  name="add_stock"
                  type="number"
                  min="1"
                  defaultValue="10"
                  className="w-full text-base font-bold text-center border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-100 font-medium transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Xác Nhận Nhập Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8 text-center text-xs text-slate-500">
        <p>SMT Factory Equipment & Maintenance Management System &bull; Dữ liệu đồng bộ từ các thư mục SMT thực tế</p>
      </footer>
    </div>
  );
}
