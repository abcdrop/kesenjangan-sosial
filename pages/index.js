import { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { FiPlus, FiMinus, FiEdit, FiEye, FiEyeOff, FiTrash2, FiSave } from 'react-icons/fi';

export default function Home() {
  const [blocks, setBlocks] = useState([]);
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState([{ text: '', link: '' }]);
  const [images, setImages] = useState({ file: null, url: '' });
  const [information, setInformation] = useState('');
  const [tags, setTags] = useState([]);
  const [sourceLinks, setSourceLinks] = useState(['']);
  const [visibility, setVisibility] = useState('show');
  const [allTags, setAllTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load blocks data
        const blocksRes = await fetch('/api/github?path=data/airdrop/data.json');
        const blocksData = await blocksRes.json();
        if (blocksData.content) {
          setBlocks(JSON.parse(atob(blocksData.content)));
        }

        // Load tags data
        const tagsRes = await fetch('/api/github?path=data/tags/tags.json');
        const tagsData = await tagsRes.json();
        if (tagsData.content) {
          setAllTags(JSON.parse(atob(tagsData.content)));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    fetchData();
  }, []);

  // Add a new step
  const addStep = () => {
    setSteps([...steps, { text: '', link: '' }]);
  };

  // Remove a step
  const removeStep = (index) => {
    if (steps.length > 1) {
      const newSteps = [...steps];
      newSteps.splice(index, 1);
      setSteps(newSteps);
    }
  };

  // Update step text or link
  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  // Add a new source link
  const addSourceLink = () => {
    setSourceLinks([...sourceLinks, '']);
  };

  // Remove a source link
  const removeSourceLink = (index) => {
    if (sourceLinks.length > 1) {
      const newLinks = [...sourceLinks];
      newLinks.splice(index, 1);
      setSourceLinks(newLinks);
    }
  };

  // Update source link
  const updateSourceLink = (index, value) => {
    const newLinks = [...sourceLinks];
    newLinks[index] = value;
    setSourceLinks(newLinks);
  };

  // Handle image file upload
  const handleImageUpload = (e) => {
    setImages({ ...images, file: e.target.files[0] });
  };

  // Handle tag selection
  const handleTagToggle = (tag) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  // Save or update block
  const saveBlock = async () => {
    const now = new Date().toISOString();
    
    const blockData = {
      id: editingId || Date.now().toString(),
      title,
      steps: steps.filter(step => step.text.trim() !== ''),
      information: information.split('\n').filter(line => line.trim() !== ''),
      tags,
      sourceLinks: sourceLinks.filter(link => link.trim() !== ''),
      visibility,
      createdAt: editingId ? blocks.find(b => b.id === editingId)?.createdAt || now : now,
      updatedAt: now
    };

    // Handle image upload if file is selected
    if (images.file) {
      const formData = new FormData();
      formData.append('file', images.file);
      formData.append('path', `data/images/${images.file.name}`);
      
      try {
        await fetch('/api/github/upload', {
          method: 'POST',
          body: formData
        });
        blockData.images = [`/data/images/${images.file.name}`];
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    } else if (images.url.trim() !== '') {
      blockData.images = [images.url];
    }

    // Update or add the block
    let updatedBlocks;
    if (editingId) {
      updatedBlocks = blocks.map(b => b.id === editingId ? blockData : b);
    } else {
      updatedBlocks = [...blocks, blockData];
    }

    // Save to GitHub
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'data/airdrop/data.json',
          content: JSON.stringify(updatedBlocks, null, 2),
          message: editingId ? `Update block ${editingId}` : 'Add new block'
        }),
      });

      if (res.ok) {
        setBlocks(updatedBlocks);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle('');
    setSteps([{ text: '', link: '' }]);
    setImages({ file: null, url: '' });
    setInformation('');
    setTags([]);
    setSourceLinks(['']);
    setVisibility('show');
    setEditingId(null);
  };

  // Edit block
  const editBlock = (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setTitle(block.title);
      setSteps(block.steps.length > 0 ? block.steps : [{ text: '', link: '' }]);
      setImages({ file: null, url: block.images?.[0] || '' });
      setInformation(block.information.join('\n'));
      setTags(block.tags || []);
      setSourceLinks(block.sourceLinks.length > 0 ? block.sourceLinks : ['']);
      setVisibility(block.visibility || 'show');
      setEditingId(id);
    }
  };

  // Delete block
  const deleteBlock = async (id) => {
    if (confirm('Are you sure you want to delete this block?')) {
      const updatedBlocks = blocks.filter(b => b.id !== id);
      
      try {
        const res = await fetch('/api/github', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: 'data/airdrop/data.json',
            content: JSON.stringify(updatedBlocks, null, 2),
            message: `Delete block ${id}`
          }),
        });

        if (res.ok) {
          setBlocks(updatedBlocks);
          if (editingId === id) {
            resetForm();
          }
        }
      } catch (error) {
        console.error('Error deleting block:', error);
      }
    }
  };

  // Toggle block visibility
  const toggleVisibility = async (id) => {
    const updatedBlocks = blocks.map(b => {
      if (b.id === id) {
        return {
          ...b,
          visibility: b.visibility === 'show' ? 'hide' : 'show',
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });

    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'data/airdrop/data.json',
          content: JSON.stringify(updatedBlocks, null, 2),
          message: `Toggle visibility for block ${id}`
        }),
      });

      if (res.ok) {
        setBlocks(updatedBlocks);
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  // Filter blocks based on search and filters
  const filteredBlocks = blocks.filter(block => {
    // Search by title
    const matchesSearch = block.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by tags
    const matchesTags = filterTags.length === 0 || 
      filterTags.every(tag => block.tags?.includes(tag));
    
    // Show only hidden
    const matchesVisibility = !showHiddenOnly || block.visibility === 'hide';
    
    return matchesSearch && matchesTags && matchesVisibility;
  });

  return (
    <div className="container">
      <Head>
        <title>Airdrop Editor</title>
        <meta name="description" content="Airdrop content editor" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="header">
        <h1>Airdrop Editor</h1>
      </header>

      <main className="main">
        {/* Editor Section */}
        <section className={styles.editorSection}>
          <h2 className="section-title">Editor</h2>
          
          <div className={styles.controls}>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="visibility"
                  value="show"
                  checked={visibility === 'show'}
                  onChange={() => setVisibility('show')}
                /> Show
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="visibility"
                  value="hide"
                  checked={visibility === 'hide'}
                  onChange={() => setVisibility('hide')}
                /> Hide
              </label>
            </div>
          </div>

          <button className="button" onClick={() => setTitle('')}>
            Add Title
          </button>
          {title === '' && (
            <input
              type="text"
              className="input"
              placeholder="Enter title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          )}

          <button className="button" onClick={() => setSteps([...steps, { text: '', link: '' }])}>
            Add Steps
          </button>
          {steps.map((step, index) => (
            <div key={index} className={styles.stepItem}>
              <input
                type="text"
                className="input"
                placeholder={`Step ${index + 1} text`}
                value={step.text}
                onChange={(e) => updateStep(index, 'text', e.target.value)}
              />
              <input
                type="text"
                className="input"
                placeholder={`Step ${index + 1} link (optional)`}
                value={step.link}
                onChange={(e) => updateStep(index, 'link', e.target.value)}
              />
            </div>
          ))}
          <div className={styles.stepControls}>
            <button className="button secondary" onClick={addStep}>
              <FiPlus /> Add Step
            </button>
            <button 
              className="button secondary" 
              onClick={() => removeStep(steps.length - 1)}
              disabled={steps.length <= 1}
            >
              <FiMinus /> Remove Step
            </button>
          </div>

          <button className="button" onClick={() => setImages({ file: null, url: '' })}>
            Add Image
          </button>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="input"
            />
            <p>OR</p>
            <input
              type="text"
              className="input"
              placeholder="Image URL"
              value={images.url}
              onChange={(e) => setImages({ ...images, url: e.target.value })}
            />
            {images.file && (
              <div>
                <p>Preview:</p>
                <img 
                  src={URL.createObjectURL(images.file)} 
                  alt="Preview" 
                  className={styles.imagePreview}
                />
              </div>
            )}
            {images.url && !images.file && (
              <div>
                <p>Preview:</p>
                <img 
                  src={images.url} 
                  alt="Preview" 
                  className={styles.imagePreview}
                />
              </div>
            )}
          </div>

          <button className="button" onClick={() => setInformation('')}>
            Add Some Information
          </button>
          {information === '' && (
            <textarea
              className="textarea"
              placeholder="Enter information (supports multiple lines)"
              value={information}
              onChange={(e) => setInformation(e.target.value)}
            />
          )}

          <button className="button" onClick={() => setTags([])}>
            Add Tags
          </button>
          {tags.length === 0 && allTags.length > 0 && (
            <div className={styles.checkboxGroup}>
              {allTags.map(tag => (
                <label key={tag} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={tags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                  />
                  {tag}
                </label>
              ))}
            </div>
          )}

          <button className="button" onClick={() => setSourceLinks([''])}>
            Add Source Link
          </button>
          {sourceLinks[0] === '' && sourceLinks.map((link, index) => (
            <div key={index} className={styles.sourceItem}>
              <input
                type="text"
                className="input"
                placeholder={`Source link ${index + 1}`}
                value={link}
                onChange={(e) => updateSourceLink(index, e.target.value)}
              />
            </div>
          ))}
          <div className={styles.stepControls}>
            <button className="button secondary" onClick={addSourceLink}>
              <FiPlus /> Add Source
            </button>
            <button 
              className="button secondary" 
              onClick={() => removeSourceLink(sourceLinks.length - 1)}
              disabled={sourceLinks.length <= 1}
            >
              <FiMinus /> Remove Source
            </button>
          </div>

          <div className="mt-20">
            <button className="button" onClick={saveBlock}>
              <FiSave /> {editingId ? 'Update Block' : 'Save Block'}
            </button>
            {editingId && (
              <button className="button secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </section>

        {/* Search and Filter Section */}
        <section className={styles.searchFilter}>
          <input
            type="text"
            className={`input ${styles.searchInput}`}
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className={styles.filterGroup}>
            <label>
              <input
                type="checkbox"
                checked={showHiddenOnly}
                onChange={() => setShowHiddenOnly(!showHiddenOnly)}
              />
              Show only hidden
            </label>
          </div>
          
          {allTags.length > 0 && (
            <div className={styles.filterGroup}>
              <span>Filter by tags:</span>
              <select
                multiple
                value={filterTags}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions, option => option.value);
                  setFilterTags(options);
                }}
                className="input"
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Preview Section */}
        <section className={styles.previewSection}>
          <h2 className="section-title">Preview ({filteredBlocks.length} blocks)</h2>
          
          {filteredBlocks.length === 0 ? (
            <p>No blocks found. Create one using the editor above.</p>
          ) : (
            filteredBlocks.map(block => (
              <div 
                key={block.id} 
                className={`card ${block.visibility === 'hide' ? 'hidden' : ''}`}
              >
                <div className="flex-between">
                  <h3 className="card-title">{block.title}</h3>
                  <div className="card-meta">
                    {new Date(block.createdAt).toLocaleDateString()}
                    {block.updatedAt !== block.createdAt && (
                      <span> (updated {new Date(block.updatedAt).toLocaleDateString()})</span>
                    )}
                  </div>
                </div>
                
                {block.images?.length > 0 && (
                  <div>
                    {block.images.map((img, i) => (
                      <img 
                        key={i} 
                        src={img.startsWith('/data/images/') ? img : img} 
                        alt={`${block.title} image ${i + 1}`} 
                        className={styles.imagePreview}
                      />
                    ))}
                  </div>
                )}
                
                {block.steps?.length > 0 && (
                  <div className="mb-20">
                    <h4>Steps:</h4>
                    <ol>
                      {block.steps.map((step, i) => (
                        <li key={i}>
                          {step.text}
                          {step.link && (
                            <a href={step.link} target="_blank" rel="noopener noreferrer">
                              [Link]
                            </a>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                
                {block.information?.length > 0 && (
                  <div className="mb-20">
                    <h4>Information:</h4>
                    {block.information.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
                
                {block.tags?.length > 0 && (
                  <div className="mb-20">
                    <h4>Tags:</h4>
                    <div className="flex">
                      {block.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {block.sourceLinks?.length > 0 && (
                  <div className="mb-20">
                    <h4>Source Links:</h4>
                    <ul>
                      {block.sourceLinks.map((link, i) => (
                        <li key={i}>
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className={styles.cardControls}>
                  <button 
                    className="button secondary" 
                    onClick={() => toggleVisibility(block.id)}
                  >
                    {block.visibility === 'show' ? <FiEyeOff /> : <FiEye />} 
                    {block.visibility === 'show' ? 'Hide' : 'Show'}
                  </button>
                  <button 
                    className="button secondary" 
                    onClick={() => editBlock(block.id)}
                  >
                    <FiEdit /> Edit
                  </button>
                  <button 
                    className="button danger" 
                    onClick={() => deleteBlock(block.id)}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
