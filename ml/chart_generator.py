import matplotlib
matplotlib.use('Agg') # Headless mode
import matplotlib.pyplot as plt
import numpy as np
import os

def create_spider_chart(teacher_data, output_path):
    """
    Generates a spider (radar) chart for the 6 behavioral dimensions and saves it to a PNG file.
    """
    dimensions = teacher_data["dimensions"]
    labels = list(dimensions.keys())
    values = list(dimensions.values())
    
    # Number of variables we're plotting
    num_vars = len(labels)
    
    # Compute angle for each axis
    angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
    
    # The plot is a circle, so we need to "complete the loop"
    # and append the start value to the end.
    values += values[:1]
    angles += angles[:1]
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
    
    # Draw one axe per variable and add labels
    plt.xticks(angles[:-1], labels, color='grey', size=11, fontweight='bold')
    
    # Draw ylabels
    ax.set_rlabel_position(30)
    plt.yticks([20, 40, 60, 80, 100], ["20", "40", "60", "80", "100"], color="grey", size=9)
    plt.ylim(0, 100)
    
    # Determine color based on overall score or tier
    tier = teacher_data.get("tier", "Average")
    color = "#537791" # Default blue
    if tier == "Excellent":
        color = "#2ecc71" # Green
    elif tier == "Needs Improvement":
        color = "#e74c3c" # Red
        
    # Plot data
    ax.plot(angles, values, color=color, linewidth=2, linestyle='solid', label=tier)
    
    # Fill area
    ax.fill(angles, values, color=color, alpha=0.25)
    
    # Add title and overall score
    plt.title(f"Behavioral Profile: {teacher_data['email']}\nOverall Score: {teacher_data['overall_score']}", size=14, color='black', y=1.1)
    
    # Save the plot
    plt.savefig(output_path, bbox_inches='tight')
    plt.close()
    
    return output_path
