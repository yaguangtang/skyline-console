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

export const vmMonitoringRanges = {
  hour: 60 * 60,
  sixHours: 6 * 60 * 60,
  day: 24 * 60 * 60,
};

export const getVmMonitoringStep = (range) => {
  if (range <= vmMonitoringRanges.hour) {
    return 10;
  }
  if (range <= vmMonitoringRanges.sixHours) {
    return 60;
  }
  return 300;
};

export const getVmMonitoringChartData = (metricData, type) => {
  const results = metricData?.result || [];
  const data = [];

  results.forEach((result) => {
    const values = result.values || result.value || [];
    const seriesType =
      typeof type === 'function' ? type(result.metric || {}) : type;
    values.forEach((value) => {
      const x = Number(value[0]);
      const y = Number(value[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        data.push({ x, y, type: seriesType });
      }
    });
  });

  return data.sort((first, second) => first.x - second.x);
};
