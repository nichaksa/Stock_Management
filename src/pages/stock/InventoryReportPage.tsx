import React, { useState, useMemo } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { GlobalFilterBar, GlobalFilterState, ReportViewMode } from '../../components/stock/GlobalFilterBar';
import { InventoryKpiGrid, InventoryKpiMetrics } from '../../components/stock/InventoryKpiGrid';
import { MovementTrendChart } from '../../components/stock/MovementTrendChart';
import { InventoryByPlantWidget, PlantInventorySummary } from '../../components/stock/InventoryByPlantWidget';
import { InventoryCompositionDonut, TypeCompositionItem } from '../../components/stock/InventoryCompositionDonut';
import { MovementByPlantChart, PlantMovementComparison } from '../../components/stock/MovementByPlantChart';
import { PendingTasksPanel } from '../../components/stock/PendingTasksPanel';
import { RecentMovementsTable } from '../../components/stock/RecentMovementsTable';
import { MaterialDetailDrawer } from '../../components/stock/MaterialDetailDrawer';
import { TransactionDetailDrawer } from '../../components/stock/TransactionDetailDrawer';

import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { exportInventoryReportToCsv } from '../../utils/export';
import {
  getStockAtDateTime,
  calculateStockStatus,
  getMovementTrendGranularData,
  ChartGranularity,
} from '../../utils/stockCalculation';
import { Material, StockTransaction, PendingTask, WorkflowStatus } from '../../types/stock';
import { INITIAL_PENDING_TASKS } from '../../mock/pendingTasks';
import { Download, RefreshCw, BarChart2 } from 'lucide-react';

export const InventoryReportPage: React.FC = () => {
  const { materials, transactions } = useStock();
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const isTh = language === 'th';

  // Global Filter State
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterState>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 31);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      viewMode: 'OVERVIEW',
      selectedPlant: 'All Plants',
      startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      startHour: '00',
      startMinute: '00',
      endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
      endHour: '23',
      endMinute: '59',
    };
  });

  // Chart Granularity State (Daily, Monthly, Yearly)
  const [trendGranularity, setTrendGranularity] = useState<ChartGranularity>('Daily');

  // Pending Tasks State with local workflow mutations
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>(() => {
    try {
      const saved = localStorage.getItem('zycoda_pending_tasks_v1');
      return saved ? JSON.parse(saved) : INITIAL_PENDING_TASKS;
    } catch {
      return INITIAL_PENDING_TASKS;
    }
  });

  // Drawers
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);

  // Derive exact ISO strings for filtering
  const startDateTimeStr = useMemo(() => {
    return `${globalFilter.startDate}T${globalFilter.startHour}:${globalFilter.startMinute}:00`;
  }, [globalFilter.startDate, globalFilter.startHour, globalFilter.startMinute]);

  const endDateTimeStr = useMemo(() => {
    return `${globalFilter.endDate}T${globalFilter.endHour}:${globalFilter.endMinute}:59`;
  }, [globalFilter.endDate, globalFilter.endHour, globalFilter.endMinute]);

  // CUMULATIVE INVENTORY BALANCE AT END DATE
  // Critical calculation: cumulative sum of all transactions up to endDateTimeStr!
  const materialsWithStockAtEndDate = useMemo(() => {
    const filteredByPlant = materials.filter(m => {
      if (globalFilter.selectedPlant !== 'All Plants' && m.plant !== globalFilter.selectedPlant) {
        return false;
      }
      return true;
    });

    return filteredByPlant.map(m => {
      const currentStock = getStockAtDateTime(m.id, transactions, endDateTimeStr);
      const stockStatus = calculateStockStatus(m, currentStock);
      const totalValue = currentStock * (m.standardPrice || 0);

      return {
        ...m,
        currentStock,
        stockStatus,
        totalValue,
      };
    });
  }, [materials, transactions, endDateTimeStr, globalFilter.selectedPlant]);

  // 1. KPI Metrics
  const kpiMetrics: InventoryKpiMetrics = useMemo(() => {
    let totalInventoryQty = 0;
    let totalInventoryVal = 0;
    let overStockCount = 0;
    let overStockVal = 0;
    let reorderCount = 0;
    let reorderVal = 0;
    let underminCount = 0;
    let underminVal = 0;
    let outOfStockCount = 0;
    let outOfStockVal = 0;
    let healthyCount = 0;

    materialsWithStockAtEndDate.forEach(m => {
      totalInventoryQty += m.currentStock;
      totalInventoryVal += m.totalValue;

      if (m.stockStatus === 'OVERMAX') {
        overStockCount++;
        overStockVal += m.totalValue;
      } else if (m.stockStatus === 'REORDERING') {
        reorderCount++;
        reorderVal += m.totalValue;
      } else if (m.stockStatus === 'UNDERMIN') {
        underminCount++;
        underminVal += m.totalValue;
      } else if (m.stockStatus === 'OUT_OF_STOCK') {
        outOfStockCount++;
        outOfStockVal += (m.max || 5) * (m.standardPrice || 0); // target reorder value
      } else if (m.stockStatus === 'NORMAL') {
        healthyCount++;
      }
    });

    return {
      totalInventoryQty,
      totalInventoryVal,
      totalItemsCount: materialsWithStockAtEndDate.length,
      overStockCount,
      overStockVal,
      reorderCount,
      reorderVal,
      underminCount,
      underminVal,
      outOfStockCount,
      outOfStockVal,
      healthyCount,
    };
  }, [materialsWithStockAtEndDate]);

  // 2. Trend Time Series Data (GR vs GI with Daily, Monthly, Yearly granularity)
  const movementTrendData = useMemo(() => {
    return getMovementTrendGranularData(
      transactions,
      startDateTimeStr,
      endDateTimeStr,
      trendGranularity,
      globalFilter.selectedPlant
    );
  }, [transactions, startDateTimeStr, endDateTimeStr, trendGranularity, globalFilter.selectedPlant]);

  // 3. Inventory Composition by Material Type
  const compositionData: TypeCompositionItem[] = useMemo(() => {
    const map: Record<string, { itemCount: number; quantity: number; value: number }> = {};

    materialsWithStockAtEndDate.forEach(m => {
      if (!map[m.materialType]) {
        map[m.materialType] = { itemCount: 0, quantity: 0, value: 0 };
      }
      map[m.materialType].itemCount += 1;
      map[m.materialType].quantity += m.currentStock;
      map[m.materialType].value += m.totalValue;
    });

    return Object.entries(map).map(([type, stats]) => ({
      name: type,
      itemCount: stats.itemCount,
      quantity: stats.quantity,
      value: stats.value,
      color: '', // generated dynamically in donut component
    }));
  }, [materialsWithStockAtEndDate]);

  // 4. Inventory by Plant Breakdown
  const plantSummaries: PlantInventorySummary[] = useMemo(() => {
    const plants = ['DEMO', 'PLANT-01', 'PLANT-02'];
    const totalValAll = kpiMetrics.totalInventoryVal || 1;
    const totalQtyAll = kpiMetrics.totalInventoryQty || 1;

    return plants.map(plantName => {
      const plantMats = materials.filter(m => m.plant === plantName);
      let totalQuantity = 0;
      let totalValue = 0;

      plantMats.forEach(m => {
        const stock = getStockAtDateTime(m.id, transactions, endDateTimeStr);
        totalQuantity += stock;
        totalValue += stock * (m.standardPrice || 0);
      });

      const percentage = globalFilter.viewMode === 'PRICE'
        ? (totalValue / totalValAll) * 100
        : (totalQuantity / totalQtyAll) * 100;

      return {
        plant: plantName,
        itemCount: plantMats.length,
        totalQuantity,
        totalValue,
        percentage: Math.min(100, Math.max(0, percentage)),
      };
    });
  }, [materials, transactions, endDateTimeStr, kpiMetrics, globalFilter.viewMode]);

  // 5. GR vs GI by Plant Comparison Chart Data
  const plantMovementData: PlantMovementComparison[] = useMemo(() => {
    const plants = ['DEMO', 'PLANT-01', 'PLANT-02'];
    const startTime = new Date(startDateTimeStr).getTime();
    const endTime = new Date(endDateTimeStr).getTime();

    const inRangeTx = transactions.filter(t => {
      const tTime = new Date(t.createdAt).getTime();
      return tTime >= startTime && tTime <= endTime;
    });

    return plants.map(plantName => {
      const plantTx = inRangeTx.filter(t => t.plant === plantName);
      let grQty = 0;
      let giQty = 0;
      let grValue = 0;
      let giValue = 0;

      plantTx.forEach(t => {
        const price = t.pricePerUnit || 0;
        if (t.transactionType === 'GR' || t.transactionType === 'OPENING') {
          const qty = Math.abs(t.quantity);
          grQty += qty;
          grValue += t.totalPrice || qty * price;
        } else if (t.transactionType === 'GI') {
          const qty = Math.abs(t.quantity);
          giQty += qty;
          giValue += t.totalPrice || qty * price;
        } else if (t.transactionType === 'ADJUSTMENT') {
          if (t.quantity > 0) {
            grQty += t.quantity;
            grValue += t.totalPrice || t.quantity * price;
          } else {
            const qty = Math.abs(t.quantity);
            giQty += qty;
            giValue += t.totalPrice || qty * price;
          }
        }
      });

      return {
        plant: plantName,
        grQty,
        giQty,
        grValue,
        giValue,
      };
    });
  }, [transactions, startDateTimeStr, endDateTimeStr]);

  // 6. Recent Movements within Filter Range
  const filteredRecentMovements = useMemo(() => {
    const startTime = new Date(startDateTimeStr).getTime();
    const endTime = new Date(endDateTimeStr).getTime();

    return transactions
      .filter(tx => {
        if (globalFilter.selectedPlant !== 'All Plants' && tx.plant !== globalFilter.selectedPlant) {
          return false;
        }
        const txTime = new Date(tx.createdAt).getTime();
        return txTime >= startTime && txTime <= endTime;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, startDateTimeStr, endDateTimeStr, globalFilter.selectedPlant]);

  // 7. Filtered Pending Tasks
  const filteredPendingTasks = useMemo(() => {
    if (globalFilter.selectedPlant === 'All Plants') return pendingTasks;
    return pendingTasks.filter(t => t.plant === globalFilter.selectedPlant);
  }, [pendingTasks, globalFilter.selectedPlant]);

  // Workflow handlers
  const handleAdvanceWorkflow = (taskId: string, nextStatus: WorkflowStatus) => {
    const userName = currentUser?.fullName || currentUser?.username || 'Admin Store Keeper';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    setPendingTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== taskId) return task;

        const updatedTimeline = task.timeline.map(step => {
          if (step.step === nextStatus) {
            return {
              ...step,
              completed: true,
              active: true,
              timestamp: timeStamp,
              responsibleUser: userName,
            };
          }
          if (
            (nextStatus === 'ACCEPT' && (step.step === 'PENDING' || step.step === 'CREATED')) ||
            (nextStatus === 'FINISH' && (step.step === 'PENDING' || step.step === 'CREATED' || step.step === 'ACCEPT')) ||
            (nextStatus === 'CONFIRM')
          ) {
            return { ...step, completed: true, active: false };
          }
          return step;
        });

        return {
          ...task,
          status: nextStatus,
          timeline: updatedTimeline,
        };
      });

      localStorage.setItem('zycoda_pending_tasks_v1', JSON.stringify(updated));
      return updated;
    });

    addToast(`Workflow step advanced to ${nextStatus}`, 'success');
  };

  const handleRejectWorkflow = (
    taskId: string,
    rejectType: 'REJECTED_STORE' | 'REJECTED_MAINTENANCE',
    reason: string
  ) => {
    setPendingTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          status: rejectType,
          rejectReason: reason,
        };
      });
      localStorage.setItem('zycoda_pending_tasks_v1', JSON.stringify(updated));
      return updated;
    });

    addToast(`Task rejected: ${reason}`, 'warning');
  };

  const handleExport = () => {
    exportInventoryReportToCsv(materials, transactions);
    addToast('Inventory Analytics exported to CSV', 'success');
  };

  return (
    <PageLayout
      title={t('inventory_report')}
      subtitle={
        isTh
          ? 'แดชบอร์ดวิเคราะห์สถานะสินค้าคงคลัง ยอดสะสมตามช่วงเวลา และระบบคำขอเบิก PickList'
          : 'Executive analytics dashboard, cumulative inventory valuation & PickList workflow tracking'
      }
      actions={
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText shadow-subtle hover:bg-app-bg transition-colors"
        >
          <Download className="w-4 h-4 text-app-muted" />
          <span>{t('export_csv')}</span>
        </button>
      }
    >
      <div className="space-y-5">
        {/* 1. GLOBAL FILTER SECTION */}
        <GlobalFilterBar
          filter={globalFilter}
          onApplyFilter={(newFilter) => {
            setGlobalFilter(newFilter);
            addToast('Analytics filter applied', 'info');
          }}
        />

        {/* 2. 6 EXECUTIVE KPI CARDS */}
        <InventoryKpiGrid
          metrics={kpiMetrics}
          viewMode={globalFilter.viewMode}
        />

        {/* 3. PRIMARY CHARTS ROW: TREND LINE + COMPOSITION DONUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <MovementTrendChart
              data={movementTrendData}
              viewMode={globalFilter.viewMode}
              granularity={trendGranularity}
              onGranularityChange={setTrendGranularity}
            />
          </div>

          <div className="lg:col-span-1">
            <InventoryCompositionDonut
              data={compositionData}
              viewMode={globalFilter.viewMode}
            />
          </div>
        </div>

        {/* 4. SECONDARY ANALYTICS ROW: INVENTORY BY PLANT + GR/GI BY PLANT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InventoryByPlantWidget
            plantSummaries={plantSummaries}
            viewMode={globalFilter.viewMode}
          />

          <MovementByPlantChart
            data={plantMovementData}
            viewMode={globalFilter.viewMode}
          />
        </div>

        {/* 5. WORKFLOW & TRANSACTION ROW: PENDING TASKS PANEL */}
        <PendingTasksPanel
          tasks={filteredPendingTasks}
          onAdvanceWorkflow={handleAdvanceWorkflow}
          onRejectWorkflow={handleRejectWorkflow}
        />

        {/* 6. RECENT MOVEMENTS TABLE (WITH SEARCH & 10/20/50/100 PAGINATION) */}
        <RecentMovementsTable
          transactions={filteredRecentMovements}
          onRowClick={(tx) => setSelectedTransaction(tx)}
        />
      </div>

      {/* DRAWERS */}
      <MaterialDetailDrawer
        isOpen={Boolean(selectedMaterial)}
        onClose={() => setSelectedMaterial(null)}
        material={selectedMaterial}
      />

      <TransactionDetailDrawer
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </PageLayout>
  );
};
