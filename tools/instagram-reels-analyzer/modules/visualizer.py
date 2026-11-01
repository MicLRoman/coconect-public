import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import matplotlib.patches as patches
import numpy as np
import os

def parse_timeline(timeline_str):
    """Парсит строку '1.2, 3.4' в список чисел"""
    if pd.isna(timeline_str):
        return []
    try:
        return [float(x) for x in str(timeline_str).split(',')]
    except:
        return []

def create_dashboard(csv_path):
    print(f"🎨 Генерируем визуальный дашборд...")
    
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"❌ Ошибка чтения CSV для графиков: {e}")
        return

    if df.empty:
        print("⚠️ Нет данных для визуализации.")
        return

    # --- ПРЕПРОЦЕССИНГ ---
    # Превращаем строки в числа (на всякий случай)
    numeric_cols = ['views', 'likes', 'comments', 'shares', 'avg_motion', 'face_pct', 'cuts_per_min']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Добавляем ER (Engagement Rate) если его нет
    if 'views' in df.columns and 'likes' in df.columns:
        df['ER'] = ((df['likes'] + df['comments']) / (df['views'] + 1)) * 100

    # --- НАСТРОЙКА СТИЛЯ ---
    sns.set_theme(style="whitegrid") # Чистый стиль
    plt.rcParams['figure.figsize'] = (20, 14)
    plt.rcParams['font.family'] = 'sans-serif'
    
    # Создаем сетку: 3 строки, 3 колонки
    fig = plt.figure(constrained_layout=True)
    gs = fig.add_gridspec(3, 3)

    # 1. SCATTER: Views vs Motion (Размер пузыря = Лайки)
    # Показывает: "Быстрые видео залетают лучше?"
    ax1 = fig.add_subplot(gs[0, 0])
    if 'views' in df.columns and 'avg_motion' in df.columns:
        sns.scatterplot(
            data=df, x='avg_motion', y='views', 
            size='likes', sizes=(50, 600), alpha=0.7, 
            hue='account', # Цвет по конкурентам
            palette='viridis', ax=ax1
        )
        ax1.set_title('Матрица Виральности: Динамика vs Просмотры', fontweight='bold')
        ax1.set_xlabel('Динамика (Motion Score)')
        ax1.set_ylabel('Просмотры')
        ax1.legend(bbox_to_anchor=(1.05, 1), loc='upper left', borderaxespad=0.)

    # 2. BAR: Shot Type Performance (Крупность плана)
    ax2 = fig.add_subplot(gs[0, 1])
    if 'shot_type' in df.columns and 'views' in df.columns:
        sns.barplot(data=df, x='shot_type', y='views', estimator=np.mean, errorbar=None, palette='magma', ax=ax2)
        ax2.set_title('Какой план работает лучше?', fontweight='bold')
        ax2.set_ylabel('Средние просмотры')
        ax2.tick_params(axis='x', rotation=15)

    # 3. BAR: Temp Type (Цветовая температура)
    ax3 = fig.add_subplot(gs[0, 2])
    if 'temp_type' in df.columns and 'views' in df.columns:
        # Сортируем: Warm, Cold, Neutral
        sns.barplot(data=df, x='temp_type', y='views', estimator=np.mean, errorbar=None, palette='coolwarm', ax=ax3)
        ax3.set_title('Влияние Цвета (Теплый vs Холодный)', fontweight='bold')
        ax3.set_ylabel('')

    # 4. REGRESSION: Face % Impact (Лицо в кадре)
    ax4 = fig.add_subplot(gs[1, 0])
    if 'face_pct' in df.columns and 'views' in df.columns:
        sns.regplot(data=df, x='face_pct', y='views', scatter_kws={'alpha':0.5}, line_kws={'color':'red'}, ax=ax4)
        ax4.set_title('Влияние Человека в кадре (%)', fontweight='bold')
        ax4.set_xlabel('% времени с лицом')

    # 5. HEATMAP: Корреляционная матрица (Что с чем связано?)
    ax5 = fig.add_subplot(gs[1, 1])
    corr_cols = ['views', 'likes', 'comments', 'avg_motion', 'face_pct', 'cuts_per_min', 'vol_avg', 'avg_sat']
    existing_corr_cols = [c for c in corr_cols if c in df.columns]
    if len(existing_corr_cols) > 1:
        corr = df[existing_corr_cols].corr()
        sns.heatmap(corr, annot=True, fmt=".2f", cmap='coolwarm', center=0, ax=ax5, vmin=-1, vmax=1)
        ax5.set_title('Факторы Успеха (Корреляция)', fontweight='bold')

    # 6. COLOR STRIP: Палитра Топ-10 видео
    ax6 = fig.add_subplot(gs[1, 2])
    ax6.set_title('Палитра Топ-10 Видео', fontweight='bold')
    ax6.axis('off')
    if 'dom_color' in df.columns:
        top_10 = df.sort_values('views', ascending=False).head(10)
        y_pos = 0
        for _, row in top_10.iterrows():
            color = row['dom_color']
            try:
                # Рисуем полоску цвета
                rect = patches.Rectangle((0, y_pos), 1, 0.8, linewidth=1, edgecolor='none', facecolor=color)
                ax6.add_patch(rect)
                # Подпись
                label_text = f"{row['account']} ({int(row['views']/1000)}k)"
                ax6.text(1.1, y_pos + 0.4, label_text, verticalalignment='center', fontsize=9)
            except: pass
            y_pos += 1
        ax6.set_xlim(0, 3)
        ax6.set_ylim(0, 10)

    # 7. TIMELINE: График динамики Топ-3 (Ритм монтажа)
    ax7 = fig.add_subplot(gs[2, :]) # На всю ширину снизу
    ax7.set_title('Ритм Монтажа Топ-3 Видео (Где зритель скучает?)', fontweight='bold')
    if 'motion_timeline' in df.columns:
        top_3 = df.sort_values('views', ascending=False).head(3)
        for _, row in top_3.iterrows():
            timeline = parse_timeline(row['motion_timeline'])
            if timeline:
                # Сглаживаем график (Rolling average), чтобы было красивее
                timeline_smooth = pd.Series(timeline).rolling(window=5, min_periods=1).mean()
                ax7.plot(timeline_smooth, label=f"{row['shortcode']} ({int(row['views']/1000)}k views)", linewidth=2)
        ax7.legend()
        ax7.set_xlabel('Время (секунды)')
        ax7.set_ylabel('Интенсивность Движения')
        ax7.grid(True, alpha=0.3)

    # Сохранение
    output_path = csv_path.replace('.csv', '_dashboard.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"✅ График сохранен: {output_path}")
    plt.close()

if __name__ == "__main__":
    # Тест на локальном файле
    pass