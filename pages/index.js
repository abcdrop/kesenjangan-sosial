import { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { FiPlus, FiMinus, FiEdit, FiEye, FiEyeOff, FiTrash2, FiSave } from 'react-icons/fi';

export default function Home() {
  const [blocks, setBlocks] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState([{ text: '', link: '' }]);
  const [images, setImages] = useState([{ file: null, url: '' }]);
  const [information, setInformation] = useState('');
  const [tags, setTags] = useState([]);
  const [sourceLinks, setSourceLinks] = useState(['']);
  const [visibility, setVisibility] = useState('show');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [showStepsInput, setShowStepsInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showInfoInput, setShowInfoInput] = useState(false);
  const [showTagsInput, setShowTagsInput] = useState(false);
  const [showSourcesInput, setShowSourcesInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GITHUB_OWNER || !process.env.NEXT_PUBLIC_GITHUB_REPO) {
      console.error('Missing required GitHub environment variables');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const blocksRes = await fetch('/api/github?path=data/airdrop/data.json');
        const blocksData = await blocksRes.json();
        if (blocksData.content) setBlocks(JSON.parse(atob(blocksData.content)));

        const tagsRes = await fetch('/api/github?path=data/tags/tags.json');
        const tagsData = await tagsRes.json();
        if (tagsData.content) setAllTags(JSON.parse(atob(tagsData.content)));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    fetchData();
  }, []);

  const encodeText = (text) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\u007F-\uFFFF]/g, (chr) => {
        return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
      });
  };

  const getImageDisplayUrl = (imgPath) => {
    if (!imgPath) return '';
    if (imgPath.startsWith('http')) return imgPath;
    if (!process.env.NEXT_PUBLIC_GITHUB_OWNER || !process.env.NEXT_PUBLIC_GITHUB_REPO) {
      console.error('GitHub repository details not configured');
      return '';
    }
    const branch = process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main';
    return `https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER}/${process.env.NEXT_PUBLIC_GITHUB_REPO}/${branch}/${imgPath}`.replace(/\s+/g, '');
  };

  // Steps management
  const addStep = () => setSteps([...steps, { text: '', link: '' }]);
  const removeStep = (index) => {
    if (steps.length > 1) {
      const newSteps = [...steps];
      newSteps.splice(index, 1);
      setSteps(newSteps);
    }
  };
  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  // Images management
  const addImage = () => setImages([...images, { file: null, url: '' }]);
  const removeImage = (index) => {
    if (images.length > 1) {
      const newImages = [...images];
      newImages.splice(index, 1);
      setImages(newImages);
    }
  };
  const updateImage = (index, field, value) => {
    const newImages = [...images];
    newImages[index][field] = value;
    setImages(newImages);
  };
  const handleImageUpload = (e, index) => {
    if (e.target.files && e.target.files[0]) {
      const newImages = [...images];
      newImages[index].file = e.target.files[0];
      newImages[index].url = '';
      setImages(newImages);
    }
  };

  // Sources management
  const addSourceLink = () => setSourceLinks([...sourceLinks, '']);
  const removeSourceLink = (index) => {
    if (sourceLinks.length > 1) {
      const newLinks = [...sourceLinks];
      newLinks.splice(index, 1);
      setSourceLinks(newLinks);
    }
  };
  const updateSourceLink = (index, value) => {
    const newLinks = [...sourceLinks];
    newLinks[index] = value;
    setSourceLinks(newLinks);
  };

  // Tags management
  const handleTagToggle = (tag) => {
    setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  };

  const saveBlock = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    const now = new Date().toISOString();
    const uploadedImages = [];
    
    // Upload all images
    for (const img of images) {
      if (img.file) {
        try {
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(img.file);
          });

          const fileName = img.file.name.replace(/\s+/g, '-').toLowerCase();
          const uploadRes = await fetch('/api/github?upload=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: base64Data,
              path: `data/images/${fileName}`,
              message: `Upload image ${fileName}`
            }),
          });

          if (uploadRes.ok) {
            uploadedImages.push(`data/images/${fileName}`);
          }
        } catch (error) {
          console.error('Upload error:', error);
        }
      } else if (img.url.trim() !== '') {
        uploadedImages.push(img.url);
      }
    }

    const blockData = {
      id: editingId || Date.now().toString(),
      title: encodeText(title),
      steps: steps.filter(step => step.text.trim() !== '').map(step => ({
        text: encodeText(step.text),
        link: step.link
      })),
      information: information.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => encodeText(line)),
      tags,
      sourceLinks: sourceLinks.filter(link => link.trim() !== ''),
      images: uploadedImages,
      visibility,
      createdAt: editingId ? blocks.find(b => b.id === editingId)?.createdAt || now : now,
      updatedAt: now
    };

    completeSave(blockData);
  };

  const completeSave = async (blockData) => {
    const updatedBlocks = editingId
      ? blocks.map(b => b.id === editingId ? blockData : b)
      : [...blocks, blockData];

    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'data/airdrop/data.json',
          content: JSON.stringify(updatedBlocks, null, 2),
          message: editingId ? `Update block ${editingId}` : 'Add new block'
        }),
      });

      if (res.ok) {
        setBlocks(updatedBlocks);
        resetForm();
      } else {
        throw new Error('Failed to save data');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data. Please try again.');
    }
  };

  const resetForm = () => {
    setTitle('');
    setSteps([{ text: '', link: '' }]);
    setImages([{ file: null, url: '' }]);
    setInformation('');
    setTags([]);
    setSourceLinks(['']);
    setVisibility('show');
    setEditingId(null);
    setShowTitleInput(false);
    setShowStepsInput(false);
    setShowImageInput(false);
    setShowInfoInput(false);
    setShowTagsInput(false);
    setShowSourcesInput(false);
  };

  const editBlock = (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setTitle(block.title);
      setSteps(block.steps.length > 0 ? block.steps : [{ text: '', link: '' }]);
      setImages(block.images?.length > 0 
        ? block.images.map(img => ({ 
            file: null, 
            url: img.startsWith('http') ? img : getImageDisplayUrl(img)
          }))
        : [{ file: null, url: '' }]
      );
      setInformation(block.information.join('\n'));
      setTags(block.tags || []);
      setSourceLinks(block.sourceLinks.length > 0 ? block.sourceLinks : ['']);
      setVisibility(block.visibility || 'show');
      setEditingId(id);
      setShowTitleInput(true);
      if (block.steps.length > 0) setShowStepsInput(true);
      if (block.images?.length > 0) setShowImageInput(true);
      if (block.information.length > 0) setShowInfoInput(true);
      if (block.tags?.length > 0) setShowTagsInput(true);
      if (block.sourceLinks?.length > 0) setShowSourcesInput(true);
    }
  };

  const deleteBlock = async (id) => {
    if (confirm('Are you sure you want to delete this block?')) {
      const updatedBlocks = blocks.filter(b => b.id !== id);
      try {
        const res = await fetch('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'data/airdrop/data.json',
            content: JSON.stringify(updatedBlocks, null, 2),
            message: `Delete block ${id}`
          }),
        });

        if (res.ok) {
          setBlocks(updatedBlocks);
          if (editingId === id) resetForm();
        } else {
          throw new Error('Failed to delete block');
        }
      } catch (error) {
        console.error('Error deleting block:', error);
        alert('Failed to delete block. Please try again.');
      }
    }
  };

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'data/airdrop/data.json',
          content: JSON.stringify(updatedBlocks, null, 2),
          message: `Toggle visibility for block ${id}`
        }),
      });

      if (res.ok) setBlocks(updatedBlocks);
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const filteredBlocks = blocks.filter(block => {
    const matchesSearch = block.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = filterTags.length === 0 || filterTags.every(tag => block.tags?.includes(tag));
    const matchesVisibility = !showHiddenOnly || block.visibility === 'hide';
    return matchesSearch && matchesTags && matchesVisibility;
  });

  return (
    <div className="container">
      <Head>
        <title>Airdrop Editor</title>
        <meta name="description" content="Airdrop content editor" />
      </Head>

      <header className="header">
        <h1>Airdrop Editor</h1>
      </header>

      <main className="main">
        <section className={styles.editorSection}>
          <h2 className="section-title">Editor</h2>
          
          <div className={styles.controlsRow}>
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

            <button 
              className={`button ${showTitleInput ? 'active' : ''}`} 
              onClick={() => setShowTitleInput(!showTitleInput)}
            >
              {showTitleInput ? 'Cancel Title' : 'Add Title'}
            </button>

            <button 
              className={`button ${showStepsInput ? 'active' : ''}`} 
              onClick={() => setShowStepsInput(!showStepsInput)}
            >
              {showStepsInput ? 'Cancel Steps' : 'Add Steps'}
            </button>

            <button 
              className={`button ${showImageInput ? 'active' : ''}`} 
              onClick={() => setShowImageInput(!showImageInput)}
            >
              {showImageInput ? 'Cancel Images' : 'Add Images'}
            </button>

            <button 
              className={`button ${showInfoInput ? 'active' : ''}`} 
              onClick={() => setShowInfoInput(!showInfoInput)}
            >
              {showInfoInput ? 'Cancel Info' : 'Add Info'}
            </button>

            <button 
              className={`button ${showTagsInput ? 'active' : ''}`} 
              onClick={() => setShowTagsInput(!showTagsInput)}
            >
              {showTagsInput ? 'Cancel Tags' : 'Add Tags'}
            </button>

            <button 
              className={`button ${showSourcesInput ? 'active' : ''}`} 
              onClick={() => setShowSourcesInput(!showSourcesInput)}
            >
              {showSourcesInput ? 'Cancel Sources' : 'Add Sources'}
            </button>
          </div>

          <div className={styles.inputFields}>
            {showTitleInput && (
              <input
                type="text"
                className="input"
                placeholder="Enter title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}

            {showStepsInput && (
              <>
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
              </>
            )}

            {showImageInput && (
              <>
                {images.map((img, index) => (
                  <div key={index} className={styles.imageInputContainer}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, index)}
                      className="input"
                    />
                    <p className={styles.imageOrText}>OR</p>
                    <input
                      type="text"
                      className="input"
                      placeholder="Image URL"
                      value={img.url}
                      onChange={(e) => updateImage(index, 'url', e.target.value)}
                    />
                    {(img.file || img.url) && (
                      <div className={styles.imagePreviewContainer}>
                        <img 
                          src={img.file ? URL.createObjectURL(img.file) : img.url} 
                          alt="Preview" 
                          className={styles.imagePreview}
                          onLoad={(e) => {
                            e.target.nextSibling.style.display = 'none';
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className={styles.imageError} style={{ display: 'none' }}>
                          Image failed to load. Please check the URL.
                        </div>
                      </div>
                    )}
                    <div className={styles.imageControls}>
                      <button 
                        className="button secondary" 
                        onClick={() => removeImage(index)}
                        disabled={images.length <= 1}
                      >
                        <FiMinus /> Remove
                      </button>
                      {index === images.length - 1 && (
                        <button className="button secondary" onClick={addImage}>
                          <FiPlus /> Add Image
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {showInfoInput && (
              <textarea
                className="textarea"
                placeholder="Enter information (supports multiple lines)"
                value={information}
                onChange={(e) => setInformation(e.target.value)}
              />
            )}

            {showTagsInput && allTags.length > 0 && (
              <div className={styles.checkboxGroup}>
                {allTags.map(tag => (
                  <label key={tag} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={tags.includes(tag)}
                      onChange={() => handleTagToggle(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            )}

            {showSourcesInput && (
              <>
                {sourceLinks.map((link, index) => (
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
              </>
            )}
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
                onChange={(e) => setFilterTags(
                  Array.from(e.target.selectedOptions, option => option.value)
                )}
                className="input"
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </section>

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
                  <div className={styles.imageContainer}>
                    {block.images.map((img, i) => {
                      const displayUrl = getImageDisplayUrl(img);
                      return (
                        <div key={i} className={styles.imageWrapper}>
                          <img 
                            src={displayUrl} 
                            alt={`${block.title} image ${i + 1}`} 
                            className={styles.imagePreview}
                            onLoad={(e) => {
                              e.target.nextSibling.style.display = 'none';
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className={styles.imageError} style={{ display: 'none' }}>
                            Image failed to load. Please check the URL.
                          </div>
                        </div>
                      );
                    })}
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
