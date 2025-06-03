import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getRainHistory } from "../services/weatherService";

const RainHistory = ({ language, darkMode }) => {
  const [history, setHistory] = React.useState({});

  React.useEffect(() => {
    const data = getRainHistory();
    setHistory(data);
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "mm" ? "my-MM" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const chartData = Object.entries(history)
    .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
    .map(([date, data]) => ({
      date: formatDate(date),
      value: data.totalPrecipitation,
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-1.5 sm:p-2 rounded-lg shadow-lg ${
            darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
          }`}
        >
          <p className="font-medium text-xs sm:text-sm">{label}</p>
          <p className="text-[10px] sm:text-xs">
            {language === "mm" ? "မိုးရွာနိုင်ခြေ" : "Rain Probability"}:{" "}
            {Math.round(payload[0].value)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`w-full p-3 sm:p-4 rounded-lg ${
        darkMode ? "bg-gray-800/50" : "bg-white/50"
      } backdrop-blur-sm`}
    >
      <h3
        className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 ${
          darkMode ? "text-white" : "text-gray-800"
        }`}
      >
        {language === "mm" ? "မိုးရွာသွန်းမှု မှတ်တမ်း" : "Rain History"}
      </h3>

      <div className="h-48 sm:h-56 md:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 5, left: -10, bottom: 10 }}
          >
            <XAxis
              dataKey="date"
              stroke={darkMode ? "#ffffff50" : "#00000050"}
              fontSize={10}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              stroke={darkMode ? "#ffffff50" : "#00000050"}
              fontSize={10}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill={darkMode ? "#EAB308" : "#2563EB"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        className={`text-[10px] sm:text-xs mt-3 sm:mt-4 ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {language === "mm"
          ? "* ပြီးခဲ့သော ၇ ရက်အတွင်း မိုးရွာနိုင်ခြေ ပျမ်းမျှ"
          : "* Average rain probability over the last 7 days"}
      </div>
    </div>
  );
};

export default RainHistory;
