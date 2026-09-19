// Copyright 2026 OpenStack Foundation
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Card, Col, Empty, Radio, Row, Spin } from 'antd';
import { Chart, Legend, Line, Tooltip } from 'bizcharts';
import moment from 'moment';
import client from 'client';
import { getSuitableValue } from 'resources/prometheus/monitoring';
import { getXScale } from 'components/PrometheusChart/utils/utils';
import {
  getVmMonitoringChartData,
  getVmMonitoringStep,
  vmMonitoringRanges,
} from './utils';
import styles from './index.less';

const refreshInterval = 5000;

const getRangeOptions = () => [
  { label: t('In the last hour'), value: vmMonitoringRanges.hour },
  { label: t('In the last 6 hours'), value: vmMonitoringRanges.sixHours },
  { label: t('In the last 24 hours'), value: vmMonitoringRanges.day },
];

const MonitoringChart = ({ data, isNetwork, range, title, unitType }) => {
  const scale = {
    x: getXScale(range),
    y: {
      nice: true,
      formatter: (value) => {
        if (unitType === 'percentage') {
          return `${Number(value).toFixed(2)}%`;
        }
        return getSuitableValue(value, unitType, 0);
      },
    },
  };

  return (
    <Card className={styles['chart-card']} title={title}>
      {data.length === 0 ? (
        <Empty
          className={styles['empty-chart']}
          description={t('No monitoring data is available for this instance.')}
        />
      ) : (
        <Chart autoFit data={data} height={300} padding="auto" scale={scale}>
          <Line position="x*y" {...(isNetwork ? { color: 'type' } : {})} />
          {isNetwork && <Legend />}
          <Tooltip shared showCrosshairs />
        </Chart>
      )}
    </Card>
  );
};

const Monitor = ({ detail }) => {
  const [rangeDuration, setRangeDuration] = useState(vmMonitoringRanges.hour);
  const [monitoringData, setMonitoringData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const hasLoaded = useRef(false);
  const isRequestInFlight = useRef(false);
  const requestVersion = useRef(0);

  const loadMonitoring = useCallback(async () => {
    if (isRequestInFlight.current) {
      return;
    }
    isRequestInFlight.current = true;
    const requestId = requestVersion.current + 1;
    requestVersion.current = requestId;
    const end = moment().unix();
    const range = [moment.unix(end - rangeDuration), moment.unix(end)];

    if (hasLoaded.current) {
      setIsRefreshing(true);
    }

    try {
      const response = await client.skyline.instanceMonitoring.get(detail.id, {
        start: end - rangeDuration,
        end,
        step: getVmMonitoringStep(rangeDuration),
      });
      if (requestId === requestVersion.current) {
        setMonitoringData({ ...response.data, range });
        setError('');
      }
    } catch (e) {
      if (requestId === requestVersion.current) {
        setError(t('Unable to load monitoring data.'));
      }
    } finally {
      if (requestId === requestVersion.current) {
        hasLoaded.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
      isRequestInFlight.current = false;
    }
  }, [detail.id, rangeDuration]);

  useEffect(() => {
    loadMonitoring();
    const timer = setInterval(loadMonitoring, refreshInterval);
    return () => {
      clearInterval(timer);
      requestVersion.current += 1;
    };
  }, [loadMonitoring]);

  const range = monitoringData.range || [
    moment().subtract(rangeDuration, 'seconds'),
    moment(),
  ];
  const cpu = getVmMonitoringChartData(monitoringData.cpu, t('CPU Usage'));
  const memory = getVmMonitoringChartData(
    monitoringData.memory,
    t('Memory Usage')
  );
  const network = getVmMonitoringChartData(
    monitoringData.network,
    (metric) =>
      metric.direction === 'receive' ? t('Receive') : t('Transmit')
  );

  return (
    <div className={styles.monitoring}>
      <div className={styles.toolbar}>
        <Radio.Group
          buttonStyle="solid"
          optionType="button"
          options={getRangeOptions()}
          value={rangeDuration}
          onChange={(event) => setRangeDuration(event.target.value)}
        />
        <span className={styles.refreshing}>
          {isRefreshing ? t('Refreshing') : t('Auto refresh: every 5 seconds')}
        </span>
      </div>
      {error && (
        <Alert
          closable
          message={error}
          type="error"
          onClose={() => setError('')}
        />
      )}
      <Spin spinning={isLoading}>
        <Row gutter={[16, 0]}>
          <Col span={12}>
            <MonitoringChart
              data={cpu}
              range={range}
              title={t('CPU Usage (%)')}
              unitType="percentage"
            />
          </Col>
          <Col span={12}>
            <MonitoringChart
              data={memory}
              range={range}
              title={t('Memory Usage')}
              unitType="memory"
            />
          </Col>
          <Col span={24}>
            <MonitoringChart
              data={network}
              isNetwork
              range={range}
              title={t('Network Traffic')}
              unitType="traffic"
            />
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Monitor;
